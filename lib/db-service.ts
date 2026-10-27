import { supabase, isSupabaseConfigured } from './supabase'
import type {
  EmployeeTask,
  InventoryItem,
  OperationalNotification,
  PurchaseOrder,
  Shipment,
  Supplier,
} from './mock-data'

export type DbResult<T> = {
  data: T | null
  error: Error | null
  isFromDb: boolean
}

// ---------------------------------------------------------------------------
// PURCHASE ORDERS / REQUISITIONS (Core Employee <-> Manager Shared Workflow)
// ---------------------------------------------------------------------------

export async function fetchDbPurchaseOrders(): Promise<PurchaseOrder[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('date', { ascending: false })

    if (error || !data) {
      return null
    }

    return data.map((row: any) => ({
      id: row.id,
      supplier: row.supplier,
      category: row.category,
      status: row.status,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unit_price),
      date: row.date,
      requesterName: row.requester_name || undefined,
      requesterId: row.requester_id || undefined,
      reviewerId: row.reviewer_id || undefined,
      reviewedAt: row.reviewed_at || undefined,
    }))
  } catch (err) {
    console.warn('[Supabase] Failed to fetch purchase orders:', err)
    return null
  }
}

export async function createDbPurchaseOrder(params: {
  id: string
  supplier: string
  category: string
  status: PurchaseOrder['status']
  quantity: number
  unitPrice: number
  date: string
  requesterId?: string
  requesterName?: string
}): Promise<PurchaseOrder | null> {
  if (!supabase) return null
  try {
    const payload = {
      id: params.id,
      supplier: params.supplier,
      category: params.category,
      status: params.status,
      quantity: params.quantity,
      unit_price: params.unitPrice,
      date: params.date,
      requester_id: params.requesterId || null,
      requester_name: params.requesterName || 'Jordan Lee',
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.warn('[Supabase] createDbPurchaseOrder error:', error.message)
      return null
    }

    return {
      id: data.id,
      supplier: data.supplier,
      category: data.category,
      status: data.status,
      quantity: Number(data.quantity),
      unitPrice: Number(data.unit_price),
      date: data.date,
      requesterName: data.requester_name,
      requesterId: data.requester_id,
    }
  } catch (err) {
    console.warn('[Supabase] createDbPurchaseOrder exception:', err)
    return null
  }
}

export async function updateDbPurchaseOrderStatus(
  id: string,
  status: PurchaseOrder['status'],
  reviewerId?: string,
  reason?: string
): Promise<boolean> {
  if (!supabase) return false
  try {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (reviewerId) {
      updatePayload.reviewer_id = reviewerId
      updatePayload.reviewed_at = new Date().toISOString()
    }
    if (reason) {
      updatePayload.rejection_reason = reason
    }

    const { error } = await supabase
      .from('purchase_orders')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      console.warn('[Supabase] updateDbPurchaseOrderStatus error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] updateDbPurchaseOrderStatus exception:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// INVENTORY ITEMS
// ---------------------------------------------------------------------------

export async function fetchDbInventory(): Promise<InventoryItem[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sku', { ascending: true })

    if (error || !data) return null

    return data.map((row: any) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      warehouse: row.warehouse,
      quantity: Number(row.quantity),
      reorderPoint: Number(row.reorder_point),
      unitCost: Number(row.unit_cost),
      updated: row.updated,
    }))
  } catch (err) {
    console.warn('[Supabase] fetchDbInventory exception:', err)
    return null
  }
}

export async function updateDbInventoryStock(id: string, quantity: number): Promise<boolean> {
  if (!supabase) return false
  try {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('inventory_items')
      .update({
        quantity: Math.max(0, quantity),
        updated: today,
      })
      .eq('id', id)

    if (error) {
      console.warn('[Supabase] updateDbInventoryStock error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] updateDbInventoryStock exception:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// SHIPMENTS
// ---------------------------------------------------------------------------

export async function fetchDbShipments(): Promise<Shipment[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('dispatch', { ascending: false })

    if (error || !data) return null

    return data.map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      origin: row.origin,
      destination: row.destination,
      carrier: row.carrier,
      dispatch: row.dispatch,
      expected: row.expected,
      actual: row.actual || undefined,
      cost: Number(row.cost),
      status: row.status,
    }))
  } catch (err) {
    console.warn('[Supabase] fetchDbShipments exception:', err)
    return null
  }
}

export async function updateDbShipmentStatus(
  id: string,
  status: Shipment['status'],
  actual?: string
): Promise<boolean> {
  if (!supabase) return false
  try {
    const today = new Date().toISOString().split('T')[0]
    const payload: Record<string, any> = { status }
    if (actual) {
      payload.actual = actual
    } else if (status === 'On time' || status === 'Delayed') {
      payload.actual = today
    }

    const { error } = await supabase.from('shipments').update(payload).eq('id', id)

    if (error) {
      console.warn('[Supabase] updateDbShipmentStatus error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] updateDbShipmentStatus exception:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------------------

export async function fetchDbSuppliers(): Promise<Supplier[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error || !data) return null

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      region: row.region,
      status: row.status,
      reliability: Number(row.reliability),
      defectRate: Number(row.defect_rate),
      spend: Number(row.spend),
      contact: row.contact,
    }))
  } catch (err) {
    console.warn('[Supabase] fetchDbSuppliers exception:', err)
    return null
  }
}

export async function updateDbSupplierStatus(id: string, status: Supplier['status']): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('suppliers').update({ status }).eq('id', id)
    if (error) {
      console.warn('[Supabase] updateDbSupplierStatus error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] updateDbSupplierStatus exception:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// EMPLOYEE TASKS
// ---------------------------------------------------------------------------

export async function fetchDbEmployeeTasks(): Promise<EmployeeTask[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('employee_tasks')
      .select('*')
      .order('due', { ascending: true })

    if (error || !data) return null

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      priority: row.priority,
      due: row.due,
      status: row.status,
      related: row.related || '',
    }))
  } catch (err) {
    console.warn('[Supabase] fetchDbEmployeeTasks exception:', err)
    return null
  }
}

export async function updateDbEmployeeTaskStatus(
  id: string,
  status: EmployeeTask['status']
): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('employee_tasks')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.warn('[Supabase] updateDbEmployeeTaskStatus error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[Supabase] updateDbEmployeeTaskStatus exception:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

export async function fetchDbNotifications(): Promise<OperationalNotification[] | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return null

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      detail: row.detail || '',
      timeAgo: row.time_ago || 'just now',
      category: row.category || 'General',
      read: Boolean(row.read),
    }))
  } catch (err) {
    console.warn('[Supabase] fetchDbNotifications exception:', err)
    return null
  }
}

export async function markDbNotificationRead(id: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

export async function markAllDbNotificationsRead(): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    return !error
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// REALTIME SUBSCRIPTION HELPER
// ---------------------------------------------------------------------------

export function subscribeToRealtimeTable(
  tableName: string,
  onPayload: (payload: any) => void
): () => void {
  if (!supabase) return () => {}

  try {
    const channelName = `realtime-${tableName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          onPayload(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Channel subscribed successfully
        }
      })

    const client = supabase
    return () => {
      client?.removeChannel(channel)
    }
  } catch (err) {
    console.warn('[Supabase] subscribeToRealtimeTable error:', err)
    return () => {}
  }
}
