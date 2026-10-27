export type InventoryItem = {
  id: string
  sku: string
  name: string
  category: string
  warehouse: string
  quantity: number
  reorderPoint: number
  unitCost: number
  updated: string
}

export type Shipment = {
  id: string
  orderId: string
  origin: string
  destination: string
  carrier: string
  dispatch: string
  expected: string
  actual?: string
  cost: number
  status: 'On time' | 'Delayed' | 'In transit'
}

export type PurchaseOrder = {
  id: string
  supplier: string
  category: string
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received'
  quantity: number
  unitPrice: number
  date: string
  requestType?: string
  requesterId?: string
  requesterName?: string
  reviewerId?: string
  reviewedAt?: string
  rejectionReason?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type EmployeeTask = {
  id: string
  title: string
  description: string
  priority: 'High' | 'Medium' | 'Low'
  due: string
  status: 'Pending' | 'In Progress' | 'Completed'
  related: string
}

export type Supplier = {
  id: string
  name: string
  region: string
  status: 'Active' | 'Review' | 'Archived'
  reliability: number
  defectRate: number
  spend: number
  contact: string
}

export type OperationalNotification = {
  id: string
  title: string
  detail: string
  timeAgo: string
  category: string
  read: boolean
}

export const TODAY = new Date('2026-10-25T12:00:00')

export const categories = ['Components', 'Packaging', 'Raw materials', 'Finished goods'] as const
export const warehouses = ['East hub', 'West hub', 'Central hub', 'Portside'] as const
export const carriers = ['DHL', 'FedEx', 'Maersk', 'UPS'] as const
export const supplierNames = [
  'Northstar Components',
  'Harbor Freight Co.',
  'Atlas Manufacturing',
  'Summit Industrial',
  'Bluewater Supply',
  'Vertex Materials',
  'Pioneer Goods',
  'Redwood Labs',
] as const

// Helper to format ISO date YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate historical date offset by days from TODAY
function daysAgo(days: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - days)
  return formatDate(d)
}

// 120 deterministic inventory items
export const initialInventory: InventoryItem[] = Array.from({ length: 120 }, (_, i) => {
  const category = categories[i % 4]
  const warehouse = warehouses[i % 4]
  const isStockout = i % 17 === 0
  const isLowStock = !isStockout && i % 6 === 0
  const reorderPoint = 60 + ((i * 11) % 90)
  const quantity = isStockout ? 0 : isLowStock ? Math.max(5, Math.floor(reorderPoint * 0.6)) : reorderPoint + 30 + ((i * 23) % 450)
  const unitCost = 15 + ((i * 13) % 190)

  return {
    id: `inv-${i + 1}`,
    sku: `SKU-${String(4100 + i).padStart(5, '0')}`,
    name: `${category} ${['Module', 'Kit', 'Assembly', 'Unit'][i % 4]} ${i + 1}`,
    category,
    warehouse,
    quantity,
    reorderPoint,
    unitCost,
    updated: daysAgo((i * 3) % 360),
  }
})

// 30 deterministic suppliers
export const initialSuppliers: Supplier[] = Array.from({ length: 30 }, (_, i) => {
  const name = `${supplierNames[i % supplierNames.length]} ${i >= supplierNames.length ? `#${i - supplierNames.length + 2}` : ''}`.trim()
  const region = ['North America', 'Europe', 'Asia Pacific'][i % 3]
  const reliability = 82 + ((i * 7) % 17)
  const defectRate = +(0.3 + ((i * 9) % 25) / 10).toFixed(1)
  const spend = 24000 + ((i * 18500) % 220000)

  return {
    id: `sup-${i + 1}`,
    name,
    region,
    status: i % 11 === 0 ? 'Review' : 'Active',
    reliability,
    defectRate,
    spend,
    contact: `ops${i + 1}@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example`,
  }
})

// 180 deterministic shipments distributed over the past 365 days
// Business rules:
// - Delivered late: actual delivery date > expected delivery date
// - Overdue in transit: expected delivery date has passed and actual is undefined
// - On time: actual delivery date <= expected delivery date
export const initialShipments: Shipment[] = Array.from({ length: 180 }, (_, i) => {
  // Distribute dispatches across the past 360 days
  // 45 shipments in last 30 days, 75 in last 31-180 days, 60 in last 181-360 days
  const dayOffset = i < 50 ? Math.floor((i * 28) / 50) : i < 120 ? 30 + Math.floor(((i - 50) * 145) / 70) : 180 + Math.floor(((i - 120) * 175) / 60)
  const dispatchDate = new Date(TODAY)
  dispatchDate.setDate(dispatchDate.getDate() - dayOffset)

  const transitDays = 3 + (i % 6)
  const expectedDate = new Date(dispatchDate)
  expectedDate.setDate(expectedDate.getDate() + transitDays)

  // Determine transit status: only recent shipments can still be in transit
  const isRecent = dayOffset < 12
  const isInTransit = isRecent && (i % 4 === 0)
  const isDelayedShipment = !isInTransit && (i % 7 === 0)

  let actualDate: Date | undefined = undefined
  let status: 'On time' | 'Delayed' | 'In transit' = 'On time'

  if (isInTransit) {
    status = 'In transit'
  } else {
    actualDate = new Date(expectedDate)
    if (isDelayedShipment) {
      actualDate.setDate(actualDate.getDate() + 2 + (i % 5))
      status = 'Delayed'
    } else {
      actualDate.setDate(actualDate.getDate() - (i % 2))
      status = 'On time'
    }
  }

  return {
    id: `SHP-${String(26000 + i)}`,
    orderId: `PO-${String(7000 + (i % 120)).padStart(5, '0')}`,
    origin: warehouses[i % 4],
    destination: ['Austin, TX', 'Rotterdam, NL', 'Osaka, JP', 'Chicago, IL', 'Frankfurt, DE', 'Singapore, SG'][i % 6],
    carrier: carriers[i % 4],
    dispatch: formatDate(dispatchDate),
    expected: formatDate(expectedDate),
    actual: actualDate ? formatDate(actualDate) : undefined,
    cost: 180 + ((i * 73) % 2400),
    status,
  }
})

// 180 deterministic purchase orders distributed across the past 365 days
const poStatuses: PurchaseOrder['status'][] = ['Draft', 'Pending', 'Approved', 'Ordered', 'Received']

export const initialPurchaseOrders: PurchaseOrder[] = Array.from({ length: 180 }, (_, i) => {
  const dayOffset = i < 55 ? Math.floor((i * 28) / 55) : i < 125 ? 30 + Math.floor(((i - 55) * 145) / 70) : 180 + Math.floor(((i - 125) * 175) / 55)
  const poDate = new Date(TODAY)
  poDate.setDate(poDate.getDate() - dayOffset)

  // Status distribution: recent POs can be Pending or Draft; older POs are Received, Ordered, or Approved
  let status: PurchaseOrder['status']
  if (dayOffset < 20) {
    status = (['Pending', 'Pending', 'Draft', 'Approved', 'Ordered'] as const)[i % 5]
  } else if (dayOffset < 90) {
    status = (['Approved', 'Ordered', 'Received', 'Ordered'] as const)[i % 4]
  } else {
    status = (['Received', 'Received', 'Received', 'Ordered'] as const)[i % 4]
  }

  return {
    id: `PO-${String(7000 + i).padStart(5, '0')}`,
    supplier: initialSuppliers[i % initialSuppliers.length].name,
    category: categories[i % 4],
    status,
    quantity: 30 + ((i * 23) % 450),
    unitPrice: 18 + ((i * 19) % 210),
    date: formatDate(poDate),
  }
})

// Initial Employee tasks
export const initialEmployeeTasks: EmployeeTask[] = [
  {
    id: 'TSK-1041',
    title: 'Audit West hub stock discrepancy',
    description: 'Verify physical quantity of Packaging Assembly 4 against warehouse count.',
    priority: 'High',
    due: '2026-10-24',
    status: 'Pending',
    related: 'inv-4',
  },
  {
    id: 'TSK-1042',
    title: 'Confirm dock appointment',
    description: 'Confirm the receiving window for incoming shipment SHP-26004.',
    priority: 'High',
    due: '2026-10-26',
    status: 'Pending',
    related: 'SHP-26004',
  },
  {
    id: 'TSK-1043',
    title: 'Review low-stock exception',
    description: 'Check reorder quantities for East hub components.',
    priority: 'Medium',
    due: '2026-10-28',
    status: 'In Progress',
    related: 'SKU-04100',
  },
  {
    id: 'TSK-1044',
    title: 'Upload delivery paperwork',
    description: 'Attach signed bill of lading to the completed delivery record.',
    priority: 'Low',
    due: '2026-10-29',
    status: 'Pending',
    related: 'SHP-26008',
  },
  {
    id: 'TSK-1045',
    title: 'Reconcile received units',
    description: 'Compare the received quantity with purchase order PO-07004.',
    priority: 'Medium',
    due: '2026-10-18',
    status: 'Completed',
    related: 'PO-07004',
  },
  {
    id: 'TSK-1046',
    title: 'Check carrier exception',
    description: 'Review the latest FedEx customs note for SHP-26012 and report status.',
    priority: 'High',
    due: '2026-10-22',
    status: 'Pending',
    related: 'SHP-26012',
  },
  {
    id: 'TSK-1047',
    title: 'Cycle count raw materials',
    description: 'Complete quarterly inventory spot-check in Portside storage.',
    priority: 'Low',
    due: '2026-10-31',
    status: 'In Progress',
    related: 'inv-12',
  },
]

export const initialNotifications: OperationalNotification[] = [
  {
    id: 'notif-1',
    title: 'Shipment SHP-26004 arrival alert',
    detail: 'Expected delivery window confirmed for tomorrow at East hub.',
    timeAgo: '1 hour ago',
    category: 'Logistics',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Low stock: Components Module 1',
    detail: 'Available inventory is below reorder threshold (38 / 70 units).',
    timeAgo: '3 hours ago',
    category: 'Inventory',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Task TSK-1046 is overdue',
    detail: 'Carrier exception review for SHP-26012 was due on Oct 22.',
    timeAgo: '5 hours ago',
    category: 'Tasks',
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Purchase order PO-07004 received',
    detail: 'Summit Industrial delivered 140 units of Packaging Kit.',
    timeAgo: '1 day ago',
    category: 'Procurement',
    read: true,
  },
  {
    id: 'notif-5',
    title: 'Supplier reliability review completed',
    detail: 'Northstar Components performance score updated to 94.6%.',
    timeAgo: '2 days ago',
    category: 'Suppliers',
    read: true,
  },
]

import {
  fetchDbPurchaseOrders,
  createDbPurchaseOrder,
  updateDbPurchaseOrderStatus,
  fetchDbInventory,
  updateDbInventoryStock,
  fetchDbShipments,
  updateDbShipmentStatus as updateDbShipmentStatusService,
  fetchDbSuppliers,
  updateDbSupplierStatus as updateDbSupplierStatusService,
  fetchDbEmployeeTasks,
  updateDbEmployeeTaskStatus,
  fetchDbNotifications,
  markDbNotificationRead,
  markAllDbNotificationsRead,
  subscribeToRealtimeTable,
} from './db-service'

const STORAGE_KEYS = {
  ORDERS: 'chainsight_demo_orders_v2',
  NOTIFS: 'chainsight_demo_notifs_v2',
  NOTIFICATIONS: 'chainsight_demo_notifs_v2',
  TASKS: 'chainsight_demo_tasks_v2',
  SHIPMENTS: 'chainsight_demo_shipments_v2',
  INVENTORY: 'chainsight_demo_inventory_v2',
  SUPPLIERS: 'chainsight_demo_suppliers_v2',
}

function loadLocalArray<T>(key: string, initial: T[]): T[] {
  if (typeof window === 'undefined') return [...initial]
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(initial))
      return [...initial]
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return [...initial]
  } catch {
    return [...initial]
  }
}

function saveLocalArray<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.warn('[LocalStorage] Save error:', err)
  }
}

// Mutable store for interactive operations during local runtime
let _inventory: InventoryItem[] = [...initialInventory]
let _suppliers: Supplier[] = [...initialSuppliers]
let _shipments: Shipment[] = [...initialShipments]
let _purchaseOrders: PurchaseOrder[] = [...initialPurchaseOrders]
let _employeeTasks: EmployeeTask[] = [...initialEmployeeTasks]
let _notifications: OperationalNotification[] = [...initialNotifications]

let _hasLoadedLocal = false
function reloadFromLocalStorage(): void {
  if (typeof window === 'undefined') return
  _purchaseOrders = loadLocalArray(STORAGE_KEYS.ORDERS, initialPurchaseOrders)
  _inventory = loadLocalArray(STORAGE_KEYS.INVENTORY, initialInventory)
  _suppliers = loadLocalArray(STORAGE_KEYS.SUPPLIERS, initialSuppliers)
  _shipments = loadLocalArray(STORAGE_KEYS.SHIPMENTS, initialShipments)
  _employeeTasks = loadLocalArray(STORAGE_KEYS.TASKS, initialEmployeeTasks)
  _notifications = loadLocalArray(STORAGE_KEYS.NOTIFS, initialNotifications)
  _hasLoadedLocal = true
}

if (typeof window !== 'undefined') {
  reloadFromLocalStorage()
}

// Cross-tab real-time synchronization in demo mode
let syncChannel: BroadcastChannel | null = null
if (typeof window !== 'undefined') {
  if ('BroadcastChannel' in window) {
    try {
      syncChannel = new BroadcastChannel('chainsight_channel')
      syncChannel.onmessage = (event) => {
        if (event.data?.topic === 'SYNC_ALL' || event.data?.topic === 'SYNC_ORDERS') {
          reloadFromLocalStorage()
          notifyListeners()
        }
      }
    } catch {}
  }

  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('chainsight_demo_')) {
      reloadFromLocalStorage()
      notifyListeners()
    }
  })
}

function broadcastLocalChange(topic: string = 'SYNC_ORDERS') {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ topic, ts: Date.now() })
    } catch {}
  }
}

export function generateNextPOId(): string {
  let maxNum = 7000
  for (const o of _purchaseOrders) {
    const match = o.id.match(/^PO-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }
  return `PO-${String(maxNum + 1).padStart(5, '0')}`
}

export function sortPurchaseOrders(orders: PurchaseOrder[]): PurchaseOrder[] {
  return [...orders].sort((a, b) => {
    const isPendingA = a.status === 'Pending'
    const isPendingB = b.status === 'Pending'

    // 1. Pending Approval requests first
    if (isPendingA && !isPendingB) return -1
    if (!isPendingA && isPendingB) return 1

    // 2. Within Pending Approval, newest submissions first
    if (isPendingA && isPendingB) {
      const timeA = new Date(a.createdAt || a.date).getTime()
      const timeB = new Date(b.createdAt || b.date).getTime()
      if (timeA !== timeB) return timeB - timeA
      return b.id.localeCompare(a.id)
    }

    // 3. Approved and Rejected requests below pending requests, newest updated first
    const timeA = new Date(a.updatedAt || a.reviewedAt || a.createdAt || a.date).getTime()
    const timeB = new Date(b.updatedAt || b.reviewedAt || b.createdAt || b.date).getTime()
    if (timeA !== timeB) return timeB - timeA
    return b.id.localeCompare(a.id)
  })
}

let _isInitializedFromDb = false
let _realtimeUnsubscribers: (() => void)[] = []

const listeners = new Set<() => void>()

export function subscribeData(listener: () => void) {
  listeners.add(listener)
  if (!_hasLoadedLocal && typeof window !== 'undefined') {
    reloadFromLocalStorage()
  }
  // Trigger DB sync once if not yet initialized
  if (!_isInitializedFromDb && typeof window !== 'undefined') {
    initSupabaseData()
  }
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn())
}

export function isDbConnected(): boolean {
  return _isInitializedFromDb
}

export async function initSupabaseData(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const [dbPOs, dbInv, dbShp, dbSups, dbTasks, dbNotifs] = await Promise.all([
      fetchDbPurchaseOrders(),
      fetchDbInventory(),
      fetchDbShipments(),
      fetchDbSuppliers(),
      fetchDbEmployeeTasks(),
      fetchDbNotifications(),
    ])

    let hasLoadedAny = false

    if (dbPOs && dbPOs.length > 0) {
      const dbIds = new Set(dbPOs.map((p) => p.id))
      const localOnly = _purchaseOrders.filter((p) => !dbIds.has(p.id))
      _purchaseOrders = [...localOnly, ...dbPOs]
      saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)
      hasLoadedAny = true
    }
    if (dbInv && dbInv.length > 0) {
      _inventory = dbInv
      saveLocalArray(STORAGE_KEYS.INVENTORY, _inventory)
      hasLoadedAny = true
    }
    if (dbShp && dbShp.length > 0) {
      _shipments = dbShp
      saveLocalArray(STORAGE_KEYS.SHIPMENTS, _shipments)
      hasLoadedAny = true
    }
    if (dbSups && dbSups.length > 0) {
      _suppliers = dbSups
      saveLocalArray(STORAGE_KEYS.SUPPLIERS, _suppliers)
      hasLoadedAny = true
    }
    if (dbTasks && dbTasks.length > 0) {
      _employeeTasks = dbTasks
      saveLocalArray(STORAGE_KEYS.TASKS, _employeeTasks)
      hasLoadedAny = true
    }
    if (dbNotifs && dbNotifs.length > 0) {
      _notifications = dbNotifs
      saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)
      hasLoadedAny = true
    }

    if (hasLoadedAny) {
      _isInitializedFromDb = true
      notifyListeners()
    }

    // Set up real-time subscriptions if not already established
    if (_realtimeUnsubscribers.length === 0) {
      setupRealtimeSubscriptions()
    }
  } catch (err) {
    console.warn('[Supabase] Initial sync error:', err)
  }
}

function setupRealtimeSubscriptions() {
  // 1. Purchase Orders (Employee Requisitions <-> Manager Approvals)
  const unsubPO = subscribeToRealtimeTable('purchase_orders', (payload) => {
    const { eventType, new: newRow, old: oldRow } = payload
    if (eventType === 'INSERT') {
      const formatted: PurchaseOrder = {
        id: newRow.id,
        supplier: newRow.supplier,
        category: newRow.category,
        status: newRow.status,
        quantity: Number(newRow.quantity),
        unitPrice: Number(newRow.unit_price),
        date: newRow.date,
        requesterName: newRow.requester_name || 'Jordan Lee',
        requesterId: newRow.requester_id,
        reviewerId: newRow.reviewer_id,
        reviewedAt: newRow.reviewed_at,
        rejectionReason: newRow.rejection_reason,
      }
      if (!_purchaseOrders.some((p) => p.id === formatted.id)) {
        _purchaseOrders = [formatted, ..._purchaseOrders]
        saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)
        notifyListeners()
      }
    } else if (eventType === 'UPDATE') {
      _purchaseOrders = _purchaseOrders.map((p) =>
        p.id === newRow.id
          ? {
              ...p,
              status: newRow.status,
              reviewerId: newRow.reviewer_id,
              reviewedAt: newRow.reviewed_at,
              rejectionReason: newRow.rejection_reason || p.rejectionReason,
              updatedAt: newRow.updated_at,
            }
          : p
      )
      saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)
      notifyListeners()
    } else if (eventType === 'DELETE') {
      _purchaseOrders = _purchaseOrders.filter((p) => p.id !== oldRow.id)
      saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)
      notifyListeners()
    }
  })

  // 2. Inventory Items
  const unsubInv = subscribeToRealtimeTable('inventory_items', (payload) => {
    const { eventType, new: newRow } = payload
    if (eventType === 'UPDATE') {
      _inventory = _inventory.map((item) =>
        item.id === newRow.id
          ? {
              ...item,
              quantity: Number(newRow.quantity),
              updated: newRow.updated,
            }
          : item
      )
      saveLocalArray(STORAGE_KEYS.INVENTORY, _inventory)
      notifyListeners()
    }
  })

  // 3. Shipments
  const unsubShp = subscribeToRealtimeTable('shipments', (payload) => {
    const { eventType, new: newRow } = payload
    if (eventType === 'UPDATE') {
      _shipments = _shipments.map((s) =>
        s.id === newRow.id
          ? {
              ...s,
              status: newRow.status,
              actual: newRow.actual || undefined,
            }
          : s
      )
      saveLocalArray(STORAGE_KEYS.SHIPMENTS, _shipments)
      notifyListeners()
    }
  })

  // 4. Employee Tasks
  const unsubTasks = subscribeToRealtimeTable('employee_tasks', (payload) => {
    const { eventType, new: newRow } = payload
    if (eventType === 'UPDATE') {
      _employeeTasks = _employeeTasks.map((t) =>
        t.id === newRow.id ? { ...t, status: newRow.status } : t
      )
      saveLocalArray(STORAGE_KEYS.TASKS, _employeeTasks)
      notifyListeners()
    }
  })

  // 5. Notifications
  const unsubNotifs = subscribeToRealtimeTable('notifications', (payload) => {
    const { eventType, new: newRow } = payload
    if (eventType === 'INSERT') {
      const formatted: OperationalNotification = {
        id: newRow.id,
        title: newRow.title,
        detail: newRow.detail || '',
        timeAgo: newRow.time_ago || 'just now',
        category: newRow.category || 'General',
        read: Boolean(newRow.read),
      }
      if (!_notifications.some((n) => n.id === formatted.id)) {
        _notifications = [formatted, ..._notifications]
        saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)
        notifyListeners()
      }
    } else if (eventType === 'UPDATE') {
      _notifications = _notifications.map((n) =>
        n.id === newRow.id ? { ...n, read: Boolean(newRow.read) } : n
      )
      saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)
      notifyListeners()
    }
  })

  _realtimeUnsubscribers = [unsubPO, unsubInv, unsubShp, unsubTasks, unsubNotifs]
}

// Exports for read-only access (backwards compatible)
export const inventory = _inventory
export const suppliers = _suppliers
export const shipments = _shipments
export const purchaseOrders = _purchaseOrders
export const employeeTasks = _employeeTasks
export const notifications = _notifications

// Data getters that return current store state
export function getInventory() {
  return _inventory
}
export function getSuppliers() {
  return _suppliers
}
export function getShipments() {
  return _shipments
}
export function getPurchaseOrders() {
  return sortPurchaseOrders(_purchaseOrders)
}
export function getEmployeeTasks() {
  return _employeeTasks
}
export function getNotifications() {
  return _notifications
}

// Action handlers to fulfill real UI operations with Supabase persistence
export async function approvePurchaseOrder(
  id: string,
  reviewerId: string = 'usr-manager',
  reviewerName: string = 'Alex Chen'
): Promise<boolean> {
  if (typeof window !== 'undefined' && !_hasLoadedLocal) {
    reloadFromLocalStorage()
  }

  const target = _purchaseOrders.find((po) => po.id === id)
  if (!target || target.status !== 'Pending') {
    return false
  }

  const now = new Date().toISOString()
  _purchaseOrders = _purchaseOrders.map((po) =>
    po.id === id
      ? {
          ...po,
          status: 'Approved',
          reviewerId,
          reviewedAt: now,
          updatedAt: now,
        }
      : po
  )
  saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)

  // Add operational notification for the employee
  const notif: OperationalNotification = {
    id: `notif-${Date.now()}`,
    title: `Requisition ${id} Approved`,
    detail: `${reviewerName} approved requisition for ${target.quantity} units of ${target.category} from ${target.supplier}.`,
    timeAgo: 'Just now',
    category: 'Procurement',
    read: false,
  }
  _notifications = [notif, ..._notifications]
  saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)

  broadcastLocalChange('SYNC_ORDERS')
  notifyListeners()

  try {
    await updateDbPurchaseOrderStatus(id, 'Approved', reviewerId)
  } catch (err) {
    console.warn('[Supabase] approve error:', err)
  }
  return true
}

export async function rejectPurchaseOrder(
  id: string,
  reviewerId: string = 'usr-manager',
  reviewerName: string = 'Alex Chen',
  reason?: string
): Promise<boolean> {
  if (typeof window !== 'undefined' && !_hasLoadedLocal) {
    reloadFromLocalStorage()
  }

  const target = _purchaseOrders.find((po) => po.id === id)
  if (!target || target.status !== 'Pending') {
    return false
  }

  const now = new Date().toISOString()
  const finalReason = reason || 'Budget allocation exceeded or vendor review required.'
  _purchaseOrders = _purchaseOrders.map((po) =>
    po.id === id
      ? {
          ...po,
          status: 'Rejected',
          reviewerId,
          reviewedAt: now,
          rejectionReason: finalReason,
          updatedAt: now,
        }
      : po
  )
  saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)

  // Add operational notification for the employee
  const notif: OperationalNotification = {
    id: `notif-${Date.now()}`,
    title: `Requisition ${id} Rejected`,
    detail: `${reviewerName} rejected requisition: "${finalReason}".`,
    timeAgo: 'Just now',
    category: 'Procurement',
    read: false,
  }
  _notifications = [notif, ..._notifications]
  saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)

  broadcastLocalChange('SYNC_ORDERS')
  notifyListeners()

  try {
    await updateDbPurchaseOrderStatus(id, 'Rejected', reviewerId, finalReason)
  } catch (err) {
    console.warn('[Supabase] reject error:', err)
  }
  return true
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']): Promise<boolean> {
  _purchaseOrders = _purchaseOrders.map((po) =>
    po.id === id ? { ...po, status, updatedAt: new Date().toISOString() } : po
  )
  saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)
  broadcastLocalChange('SYNC_ORDERS')
  notifyListeners()
  const ok = await updateDbPurchaseOrderStatus(id, status)
  return ok
}

export async function createPurchaseOrder(
  po: Omit<PurchaseOrder, 'id' | 'date'> & {
    date?: string
    requesterId?: string
    requesterName?: string
    requestType?: string
    notes?: string
  }
): Promise<PurchaseOrder> {
  if (typeof window !== 'undefined' && !_hasLoadedLocal) {
    reloadFromLocalStorage()
  }

  const newId = generateNextPOId()
  const now = new Date().toISOString()
  const newPO: PurchaseOrder = {
    ...po,
    id: newId,
    date: po.date || formatDate(TODAY),
    status: 'Pending',
    requesterId: po.requesterId || 'usr-employee',
    requesterName: po.requesterName || 'Jordan Lee',
    requestType: po.requestType || 'Purchase Requisition',
    notes: po.notes || '',
    createdAt: now,
    updatedAt: now,
  }

  _purchaseOrders = [newPO, ..._purchaseOrders]
  saveLocalArray(STORAGE_KEYS.ORDERS, _purchaseOrders)

  // Add operational notification for the Manager
  const newNotif: OperationalNotification = {
    id: `notif-${Date.now()}`,
    title: `New Requisition: ${newPO.id}`,
    detail: `${newPO.requesterName} submitted requisition for ${newPO.quantity} units of ${newPO.category} from ${newPO.supplier}.`,
    timeAgo: 'Just now',
    category: 'Procurement',
    read: false,
  }
  _notifications = [newNotif, ..._notifications]
  saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)

  broadcastLocalChange('SYNC_ORDERS')
  notifyListeners()

  // Persist to Supabase if available
  try {
    await createDbPurchaseOrder({
      id: newPO.id,
      supplier: newPO.supplier,
      category: newPO.category,
      status: newPO.status,
      quantity: newPO.quantity,
      unitPrice: newPO.unitPrice,
      date: newPO.date,
      requesterId: newPO.requesterId,
      requesterName: newPO.requesterName,
    })
  } catch (err) {
    console.warn('[Supabase] optional write notice in createPurchaseOrder:', err)
  }

  return newPO
}

export async function updateShipmentStatus(id: string, status: Shipment['status'], actual?: string): Promise<boolean> {
  const actualDate = actual || (status === 'On time' || status === 'Delayed' ? formatDate(TODAY) : undefined)
  _shipments = _shipments.map((s) =>
    s.id === id
      ? {
          ...s,
          status,
          actual: actualDate,
        }
      : s
  )
  saveLocalArray(STORAGE_KEYS.SHIPMENTS, _shipments)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await updateDbShipmentStatusService(id, status, actualDate)
  return ok
}

export async function updateInventoryStock(id: string, quantity: number): Promise<boolean> {
  const q = Math.max(0, quantity)
  _inventory = _inventory.map((item) =>
    item.id === id ? { ...item, quantity: q, updated: formatDate(TODAY) } : item
  )
  saveLocalArray(STORAGE_KEYS.INVENTORY, _inventory)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await updateDbInventoryStock(id, q)
  return ok
}

export async function updateSupplierStatus(id: string, status: Supplier['status']): Promise<boolean> {
  _suppliers = _suppliers.map((s) => (s.id === id ? { ...s, status } : s))
  saveLocalArray(STORAGE_KEYS.SUPPLIERS, _suppliers)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await updateDbSupplierStatusService(id, status)
  return ok
}

export async function completeEmployeeTask(id: string): Promise<boolean> {
  _employeeTasks = _employeeTasks.map((t) =>
    t.id === id ? { ...t, status: 'Completed' } : t
  )
  saveLocalArray(STORAGE_KEYS.TASKS, _employeeTasks)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await updateDbEmployeeTaskStatus(id, 'Completed')
  return ok
}

export async function updateEmployeeTaskStatus(id: string, status: EmployeeTask['status']): Promise<boolean> {
  _employeeTasks = _employeeTasks.map((t) =>
    t.id === id ? { ...t, status } : t
  )
  saveLocalArray(STORAGE_KEYS.TASKS, _employeeTasks)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await updateDbEmployeeTaskStatus(id, status)
  return ok
}

export function addEmployeeTask(task: Omit<EmployeeTask, 'id'>) {
  const newId = `TSK-${String(1040 + _employeeTasks.length + 1)}`
  const newTask: EmployeeTask = { ...task, id: newId }
  _employeeTasks = [newTask, ..._employeeTasks]
  saveLocalArray(STORAGE_KEYS.TASKS, _employeeTasks)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  return newTask
}

export async function markNotificationRead(id: string): Promise<boolean> {
  _notifications = _notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  )
  saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await markDbNotificationRead(id)
  return ok
}

export async function markAllNotificationsRead(): Promise<boolean> {
  _notifications = _notifications.map((n) => ({ ...n, read: true }))
  saveLocalArray(STORAGE_KEYS.NOTIFS, _notifications)
  broadcastLocalChange('SYNC_ALL')
  notifyListeners()
  const ok = await markAllDbNotificationsRead()
  return ok
}

// Business rule calculations
export function inventoryStatus(item: InventoryItem): 'Stockout' | 'Low stock' | 'Healthy' {
  if (item.quantity === 0) return 'Stockout'
  if (item.quantity <= item.reorderPoint) return 'Low stock'
  return 'Healthy'
}

export function inventoryValue(rows: InventoryItem[] = _inventory): number {
  return rows.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
}

export function procurementSpend(rows: PurchaseOrder[] = _purchaseOrders): number {
  return rows
    .filter((row) => row.status !== 'Draft' && row.status !== 'Rejected')
    .reduce((sum, row) => sum + row.quantity * row.unitPrice, 0)
}

export function isShipmentDelayed(shipment: Shipment, refDate: Date = TODAY): boolean {
  if (shipment.actual) {
    return new Date(`${shipment.actual}T00:00:00`) > new Date(`${shipment.expected}T00:00:00`)
  }
  // In transit: only overdue if expected date has already passed
  return new Date(`${shipment.expected}T00:00:00`) < refDate
}

export function isShipmentOverdueInTransit(shipment: Shipment, refDate: Date = TODAY): boolean {
  return !shipment.actual && new Date(`${shipment.expected}T00:00:00`) < refDate
}

export function calculateOnTimeRate(shipmentList: Shipment[]): number {
  const delivered = shipmentList.filter((s) => Boolean(s.actual))
  if (!delivered.length) return 0
  const onTime = delivered.filter((s) => !isShipmentDelayed(s)).length
  return Math.round((onTime / delivered.length) * 100)
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || !rows.length) return
  const keys = Object.keys(rows[0])
  const csvContent = [
    keys.join(','),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const val = row[key]
          if (val === null || val === undefined) return '""'
          return JSON.stringify(String(val))
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
