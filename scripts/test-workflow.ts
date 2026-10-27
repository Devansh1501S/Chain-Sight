import * as assert from 'node:assert'
import {
  createPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  getPurchaseOrders,
  sortPurchaseOrders,
  procurementSpend,
  inventoryValue,
  getInventory,
  generateNextPOId,
  type PurchaseOrder,
} from '../lib/mock-data'

async function runTests() {
  console.log('--- STARTING CHAIN-SIGHT WORKFLOW TESTS ---')

  // Initial State Check
  const initialOrders = getPurchaseOrders()
  const initialPending = initialOrders.filter((o) => o.status === 'Pending').length
  console.log(`[Setup] Initial total orders: ${initialOrders.length}, pending: ${initialPending}`)

  // -------------------------------------------------------------------------
  // TEST A: Demo Request Submission
  // -------------------------------------------------------------------------
  console.log('\n[Test A] Submitting new employee requisition...')
  const newOrder = await createPurchaseOrder({
    supplier: 'Northstar Components',
    category: 'Components',
    status: 'Pending',
    quantity: 125,
    unitPrice: 42,
    requestType: 'Purchase Requisition',
    notes: 'Urgent line replenishment for West Hub',
    requesterId: 'usr-employee',
    requesterName: 'Jordan Lee',
  })

  assert.ok(newOrder.id.startsWith('PO-'), 'Request ID must have PO- prefix')
  assert.strictEqual(newOrder.status, 'Pending', 'Initial status must be Pending')
  assert.strictEqual(newOrder.requesterName, 'Jordan Lee', 'Requester name must be Jordan Lee')
  assert.strictEqual(newOrder.quantity, 125, 'Quantity must match')
  assert.strictEqual(newOrder.unitPrice, 42, 'Price must match')
  console.log(`✓ Created order: ${newOrder.id} (${newOrder.quantity} units @ $${newOrder.unitPrice})`)

  // Check Manager visibility & sorting (Section 8: Pending first, newest pending at top)
  const ordersAfterCreate = getPurchaseOrders()
  assert.strictEqual(ordersAfterCreate[0].id, newOrder.id, 'New pending request must be first row in queue')
  const newPendingCount = ordersAfterCreate.filter((o) => o.status === 'Pending').length
  assert.strictEqual(newPendingCount, initialPending + 1, 'Pending count must increment by 1')
  console.log(`✓ Manager approval queue contains ${newOrder.id} at position 0`)
  console.log(`✓ Pending approvals count increased from ${initialPending} to ${newPendingCount}`)

  // -------------------------------------------------------------------------
  // TEST B: Approval Action
  // -------------------------------------------------------------------------
  console.log('\n[Test B] Manager approving order...')
  const approved = await approvePurchaseOrder(newOrder.id, 'usr-manager', 'Alex Chen')
  assert.strictEqual(approved, true, 'Approve operation must return true')

  const ordersAfterApprove = getPurchaseOrders()
  const approvedRecord = ordersAfterApprove.find((o) => o.id === newOrder.id)
  assert.ok(approvedRecord, 'Approved record must exist')
  assert.strictEqual(approvedRecord.status, 'Approved', 'Status must be updated to Approved')
  assert.strictEqual(approvedRecord.reviewerId, 'usr-manager', 'Reviewer ID must be usr-manager')
  assert.ok(approvedRecord.reviewedAt, 'Reviewed timestamp must be recorded')

  const pendingAfterApprove = ordersAfterApprove.filter((o) => o.status === 'Pending').length
  assert.strictEqual(pendingAfterApprove, initialPending, 'Pending count must decrement back')
  console.log(`✓ Order ${newOrder.id} status is now Approved`)
  console.log(`✓ Reviewer: ${approvedRecord.reviewerId} at ${approvedRecord.reviewedAt}`)
  console.log(`✓ Pending count decremented to ${pendingAfterApprove}`)

  // -------------------------------------------------------------------------
  // TEST C: Rejection Action
  // -------------------------------------------------------------------------
  console.log('\n[Test C] Submitting and rejecting a second requisition...')
  const secondOrder = await createPurchaseOrder({
    supplier: 'Vertex Materials',
    category: 'Raw materials',
    status: 'Pending',
    quantity: 300,
    unitPrice: 15,
    requestType: 'Inventory Replenishment',
    notes: 'Secondary stock buffer',
    requesterId: 'usr-employee',
    requesterName: 'Jordan Lee',
  })

  console.log(`✓ Created second order: ${secondOrder.id}`)
  const rejectionReason = 'Category budget allocation exceeded for Q4'
  const rejected = await rejectPurchaseOrder(secondOrder.id, 'usr-manager', 'Alex Chen', rejectionReason)
  assert.strictEqual(rejected, true, 'Reject operation must return true')

  const ordersAfterReject = getPurchaseOrders()
  const rejectedRecord = ordersAfterReject.find((o) => o.id === secondOrder.id)
  assert.ok(rejectedRecord, 'Rejected record must exist')
  assert.strictEqual(rejectedRecord.status, 'Rejected', 'Status must be Rejected')
  assert.strictEqual(rejectedRecord.rejectionReason, rejectionReason, 'Rejection reason must be preserved')
  console.log(`✓ Order ${secondOrder.id} status is now Rejected`)
  console.log(`✓ Rejection reason: "${rejectedRecord.rejectionReason}"`)

  // -------------------------------------------------------------------------
  // TEST D & G: Sorting & Business Logic Integrity
  // -------------------------------------------------------------------------
  console.log('\n[Test D & G] Checking sorting order & financial calculations...')
  const currentOrders = getPurchaseOrders()
  // Ensure all pending orders precede non-pending orders
  let seenNonPending = false
  for (const o of currentOrders) {
    if (o.status !== 'Pending') {
      seenNonPending = true
    } else if (seenNonPending) {
      assert.fail(`Pending order ${o.id} found after non-pending order in queue`)
    }
  }
  console.log('✓ Section 8 verification: All Pending requests appear before Approved/Rejected records')

  const spend = procurementSpend(currentOrders)
  assert.ok(spend > 0, 'Procurement spend must be calculated')
  const inv = getInventory()
  const value = inventoryValue(inv)
  assert.ok(value > 0, 'Inventory valuation must be valid')
  console.log(`✓ Total procurement spend: $${spend.toLocaleString()}`)
  console.log(`✓ Total inventory valuation: $${value.toLocaleString()}`)

  console.log('\n>>> ALL WORKFLOW TESTS PASSED SUCCESSFULLY! <<<\n')
}

runTests().catch((err) => {
  console.error('Test failed with error:', err)
  process.exit(1)
})
