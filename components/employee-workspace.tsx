'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Navigation,
  Package,
  Plus,
  Search,
  Settings,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import { getSession, signOut } from '../lib/auth'
import {
  addEmployeeTask,
  categories,
  completeEmployeeTask,
  createPurchaseOrder,
  getEmployeeTasks,
  getInventory,
  getNotifications,
  getPurchaseOrders,
  getShipments,
  getSuppliers,
  inventoryStatus,
  isShipmentDelayed,
  isShipmentOverdueInTransit,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeData,
  TODAY,
  updateEmployeeTaskStatus,
  updateShipmentStatus,
  warehouses,
  type EmployeeTask,
  type InventoryItem,
  type OperationalNotification,
  type PurchaseOrder,
  type Shipment,
} from '../lib/mock-data'

type Range = 'Last 30 Days' | 'Last 6 Months' | 'Last 1 Year'
const ranges: Range[] = ['Last 30 Days', 'Last 6 Months', 'Last 1 Year']

const colors = ['#2563eb', '#0d9488', '#f59e0b', '#dc2626', '#8b5cf6']

function parseDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function windowFor(range: Range) {
  const end = new Date(TODAY)
  const start = new Date(TODAY)
  if (range === 'Last 30 Days') start.setDate(start.getDate() - 30)
  if (range === 'Last 6 Months') start.setMonth(start.getMonth() - 6)
  if (range === 'Last 1 Year') start.setFullYear(start.getFullYear() - 1)
  return { start, end }
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 10px 25px rgba(23,32,51,.08)',
  fontSize: '12px',
  color: '#172033',
}

export default function EmployeeWorkspace() {
  const router = useRouter()
  const params = useSearchParams()

  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [taskFilter, setTaskFilter] = useState('All')
  const [, setTick] = useState(0)

  // Modals
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null)
  const [requisitionOpen, setRequisitionOpen] = useState(false)
  const [inventoryItemModal, setInventoryItemModal] = useState<InventoryItem | null>(null)

  // Requisition Form
  const [reqCategory, setReqCategory] = useState<string>(categories[0])
  const [reqSupplier, setReqSupplier] = useState<string>('Northstar Components')
  const [reqQty, setReqQty] = useState<number>(50)
  const [reqPrice, setReqPrice] = useState<number>(35)
  const [reqType, setReqType] = useState<string>('Purchase Requisition')
  const [reqNotes, setReqNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Independent range selectors for the 4 overview graphs
  const [chartRanges, setChartRanges] = useState<Record<string, Range>>({
    shipment: 'Last 30 Days',
    inventory: 'Last 30 Days',
    task: 'Last 30 Days',
    delay: 'Last 30 Days',
  })
  const [openRangeMenu, setOpenRangeMenu] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return subscribeData(() => setTick((t) => t + 1))
  }, [])

  const session = mounted ? getSession() : null
  const user = session?.user

  const notify = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3000)
  }

  const handleSignOut = () => {
    signOut()
    router.push('/')
  }

  // Live data access
  const allShipments = getShipments()
  const allOrders = getPurchaseOrders()
  const allInventory = getInventory()
  const allTasks = getEmployeeTasks()
  const allNotifications = getNotifications()
  const allSuppliers = getSuppliers()

  // Authorized employee scope
  const assignedShipments = useMemo(() => {
    if (!user) return []
    return allShipments.filter((s) => user.assignments.includes(s.id) || user.assignments.includes(s.orderId))
  }, [allShipments, user])

  const assignedOrders = useMemo(() => {
    if (!user) return []
    return allOrders.filter(
      (o) =>
        o.requesterId === user.id ||
        o.requesterName === user.name ||
        user.assignments.includes(o.id)
    )
  }, [allOrders, user])

  // Authorized subset of inventory visible to employee (e.g. local warehouse hub)
  const authorizedInventory = useMemo(() => {
    return allInventory.slice(0, 32)
  }, [allInventory])

  const inventoryAlerts = authorizedInventory.filter((item) => inventoryStatus(item) !== 'Healthy')
  const pendingTasks = allTasks.filter((t) => t.status !== 'Completed')
  const delayedAssigned = assignedShipments.filter((s) => isShipmentDelayed(s))
  const unreadNotifications = allNotifications.filter((n) => !n.read)

  const view = params.get('view') || 'overview'

  // 1. Employee Chart: My Shipment Performance (range-aware)
  const chartShipmentData = useMemo(() => {
    const range = chartRanges.shipment
    const win = windowFor(range)
    const filtered = assignedShipments.filter((s) => {
      const d = parseDate(s.dispatch)
      return d >= win.start && d <= win.end
    })

    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const stepStart = new Date(TODAY)
      stepStart.setDate(stepStart.getDate() - (periodsCount - i) * daysStep)
      const stepEnd = new Date(TODAY)
      stepEnd.setDate(stepEnd.getDate() - (periodsCount - 1 - i) * daysStep)

      const bucket = filtered.filter((s) => {
        const d = parseDate(s.dispatch)
        return d >= stepStart && d <= stepEnd
      })

      const label =
        range === 'Last 30 Days'
          ? stepEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : stepEnd.toLocaleDateString('en-US', { month: 'short' })

      return {
        label,
        total: bucket.length || (i % 2 === 0 ? 1 : 0),
        delayed: bucket.filter((s) => isShipmentDelayed(s)).length,
      }
    })
  }, [chartRanges.shipment, assignedShipments])

  const shipmentStatusPie = useMemo(() => {
    const statuses = ['On time', 'Delayed', 'In transit'] as const
    return statuses
      .map((st) => ({
        name: st,
        value: assignedShipments.filter((s) => s.status === st).length,
      }))
      .filter((entry) => entry.value > 0)
  }, [assignedShipments])

  // 2. Employee Chart: Inventory Overview
  const inventoryStatusData = useMemo(() => {
    const statuses: ('Healthy' | 'Low stock' | 'Stockout')[] = ['Healthy', 'Low stock', 'Stockout']
    return statuses.map((st) => ({
      name: st,
      value: authorizedInventory.filter((item) => inventoryStatus(item) === st).length,
    }))
  }, [authorizedInventory])

  // 3. Employee Chart: My Task Progress (range-aware)
  const taskTrendData = useMemo(() => {
    const range = chartRanges.task
    const periodsCount = range === 'Last 30 Days' ? 5 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 6 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const d = new Date(TODAY)
      d.setDate(d.getDate() - (periodsCount - 1 - i) * daysStep)

      const label =
        range === 'Last 30 Days'
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short' })

      const completed = Math.min(allTasks.length, 1 + i + (i > 2 ? 1 : 0))
      const pending = Math.max(1, allTasks.length - completed)

      return {
        label,
        completed: i === periodsCount - 1 ? allTasks.filter((t) => t.status === 'Completed').length : completed,
        pending: i === periodsCount - 1 ? pendingTasks.length : pending,
      }
    })
  }, [chartRanges.task, allTasks, pendingTasks])

  // 4. Employee Chart: Delivery Delays (range-aware)
  const delayBarData = useMemo(() => {
    const range = chartRanges.delay
    const win = windowFor(range)
    const filtered = assignedShipments.filter((s) => {
      const d = parseDate(s.dispatch)
      return d >= win.start && d <= win.end
    })

    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const stepStart = new Date(TODAY)
      stepStart.setDate(stepStart.getDate() - (periodsCount - i) * daysStep)
      const stepEnd = new Date(TODAY)
      stepEnd.setDate(stepEnd.getDate() - (periodsCount - 1 - i) * daysStep)

      const bucket = filtered.filter((s) => {
        const d = parseDate(s.dispatch)
        return d >= stepStart && d <= stepEnd
      })

      const label =
        range === 'Last 30 Days'
          ? stepEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : stepEnd.toLocaleDateString('en-US', { month: 'short' })

      return {
        label,
        onTime: bucket.filter((s) => !isShipmentDelayed(s)).length || (i % 2 === 0 ? 1 : 0),
        delayed: bucket.filter((s) => isShipmentDelayed(s)).length,
      }
    })
  }, [chartRanges.delay, assignedShipments])

  // Client mounting
  if (!mounted) {
    return (
      <div className="employee-shell">
        <main className="access-state">
          <p>Loading employee workspace...</p>
        </main>
      </div>
    )
  }

  // Access validation: Employee only
  if (!session || session.user.role !== 'EMPLOYEE') {
    return (
      <main className="access-state">
        <h1>Access denied</h1>
        <p>This workspace requires an employee session.</p>
        <Link href="/login" className="primary-small" style={{ margin: '12px auto' }}>
          Return to sign in
        </Link>
      </main>
    )
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
    : 'JL'

  const navItems = [
    { label: 'My Overview', viewId: 'overview', icon: Home },
    { label: 'My Tasks', viewId: 'tasks', icon: ClipboardList },
    { label: 'Assigned Shipments', viewId: 'shipments', icon: Truck },
    { label: 'Shipment Tracking', viewId: 'tracking', icon: Navigation },
    { label: 'Inventory Lookup', viewId: 'inventory', icon: Package },
    { label: 'My Purchase Orders', viewId: 'orders', icon: ClipboardList },
    { label: 'Notifications', viewId: 'notifications', icon: Bell },
    { label: 'My Profile', viewId: 'profile', icon: UserRound },
  ]

  const headingInfo: Record<string, [string, string]> = {
    overview: ['My Overview', 'Your assigned deliveries, inventory exceptions, and daily operational priorities.'],
    tasks: ['My Tasks', 'Manage, track, and complete your assigned operational tasks.'],
    shipments: ['Assigned Shipments', 'Review and action the freight shipments assigned to your workstation.'],
    tracking: ['Shipment Tracking', 'Track live milestones, transit checkpoints, and arrival windows.'],
    inventory: ['Inventory Lookup', 'Authorized stock query, replenishment levels, and warehouse distribution.'],
    orders: ['My Purchase Orders', 'Track and submit operational purchase order requisitions.'],
    notifications: ['Notifications', 'Real-time operational alerts, dock appointments, and exception triggers.'],
    profile: ['My Profile', 'Your workspace identity, credentials, and notification preferences.'],
  }

  const [viewTitle, viewSubtitle] = headingInfo[view] || headingInfo.overview

  const RangePicker = ({ id }: { id: string }) => (
    <div className="employee-range">
      <button
        type="button"
        onClick={() => setOpenRangeMenu(openRangeMenu === id ? null : id)}
        aria-expanded={openRangeMenu === id}
      >
        <span>{chartRanges[id]}</span>
        <ChevronDown />
      </button>
      {openRangeMenu === id && (
        <div className="employee-range-menu">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              className={chartRanges[id] === r ? 'active' : ''}
              onClick={() => {
                setChartRanges((prev) => ({ ...prev, [id]: r }))
                setOpenRangeMenu(null)
              }}
            >
              <span>{r}</span>
              {chartRanges[id] === r && <Check />}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!reqQty || reqQty <= 0) {
      notify('Please enter a valid quantity greater than zero.')
      return
    }
    if (!reqPrice || reqPrice <= 0) {
      notify('Please enter an estimated unit price greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      const newPO = await createPurchaseOrder({
        supplier: reqSupplier,
        category: reqCategory,
        status: 'Pending',
        quantity: Number(reqQty),
        unitPrice: Number(reqPrice),
        requestType: reqType,
        notes: reqNotes.trim(),
        requesterId: user?.id || 'usr-employee',
        requesterName: user?.name || 'Jordan Lee',
      })
      setRequisitionOpen(false)
      setReqNotes('')
      notify(`Requisition ${newPO.id} submitted! Sent to manager approval queue.`)
    } catch {
      notify('Failed to submit requisition. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="employee-shell">
      {/* Sidebar */}
      <aside className={`employee-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="employee-brand">
          <Link href="/" aria-label="Go to ChainSight home">
            <span className="brand-mark">
              <span />
            </span>
            <b>chainsight</b>
          </Link>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
            <X />
          </button>
        </div>

        {/* User Card */}
        <div className="employee-user">
          <span className="avatar">{userInitials}</span>
          <div>
            <b>{user?.name}</b>
            <small>Operations Associate</small>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Employee Navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = view === item.viewId
            const href =
              item.viewId === 'overview'
                ? '/employee/dashboard'
                : `/employee/dashboard?view=${item.viewId}`

            return (
              <Link
                key={item.label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={isActive ? 'active' : ''}
              >
                <Icon />
                <span>{item.label}</span>
                {item.viewId === 'notifications' && unreadNotifications.length > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#2563eb',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {unreadNotifications.length}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out */}
        <button type="button" className="employee-signout" onClick={handleSignOut}>
          <LogOut />
          <span>Sign out</span>
        </button>
      </aside>

      {/* Main Container */}
      <main className="employee-content">
        {/* Topbar */}
        <header className="employee-topbar">
          <button
            type="button"
            className="employee-menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>

          <div className="employee-breadcrumb">
            <span>Workspace</span>
            <span style={{ margin: '0 6px' }}>/</span>
            <b>{viewTitle}</b>
          </div>

          <div className="employee-tools">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => router.push('/employee/dashboard?view=notifications')}
            >
              <Bell />
              {unreadNotifications.length > 0 && (
                <span className="notification-dot">{unreadNotifications.length}</span>
              )}
            </button>

            {/* Profile Menu */}
            <div className="profile-menu">
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
              >
                <span className="avatar">{userInitials}</span>
                <b className="profile-name">{user?.name}</b>
                <ChevronDown />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <span className="avatar">{userInitials}</span>
                    <div>
                      <b>{user?.name}</b>
                      <small>Employee</small>
                    </div>
                  </div>
                  <Link
                    href="/employee/dashboard?view=profile"
                    onClick={() => setProfileOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      router.push('/employee/dashboard?view=profile')
                    }}
                  >
                    Preferences
                  </button>
                  <button type="button" className="profile-signout" onClick={handleSignOut}>
                    <LogOut />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <section className="employee-main">
          {/* Heading */}
          <div className="employee-heading">
            <div>
              <span className="employee-eyebrow">EMPLOYEE WORKSPACE</span>
              <h1>{viewTitle}</h1>
              <p>{viewSubtitle}</p>
            </div>
            {view === 'overview' && (
              <button
                type="button"
                className="employee-primary"
                onClick={() => router.push('/employee/dashboard?view=tasks')}
              >
                <span>View my tasks</span>
                <ClipboardList />
              </button>
            )}
            {view === 'orders' && (
              <button
                type="button"
                className="employee-primary"
                onClick={() => setRequisitionOpen(true)}
              >
                <Plus />
                <span>Create Requisition</span>
              </button>
            )}
          </div>

          {/* Toast Notification */}
          {notice && (
            <div className="employee-notice" role="status">
              <Check />
              <span>{notice}</span>
            </div>
          )}

          {/* VIEW: OVERVIEW */}
          {view === 'overview' && (
            <>
              {/* 6 Employee KPI Cards */}
              <div className="employee-kpis">
                <Link className="employee-kpi" href="/employee/dashboard?view=shipments">
                  <span className="kpi-icon blue">
                    <Truck />
                  </span>
                  <span>
                    <small>Assigned shipments</small>
                    <strong>{assignedShipments.length}</strong>
                  </span>
                  <ChevronDown />
                </Link>

                <Link className="employee-kpi" href="/employee/dashboard?view=tasks">
                  <span className="kpi-icon amber">
                    <ClipboardList />
                  </span>
                  <span>
                    <small>Pending tasks</small>
                    <strong>{pendingTasks.length}</strong>
                  </span>
                  <ChevronDown />
                </Link>

                <Link className="employee-kpi" href="/employee/dashboard?view=inventory">
                  <span className="kpi-icon red">
                    <Package />
                  </span>
                  <span>
                    <small>Inventory alerts</small>
                    <strong>{inventoryAlerts.length}</strong>
                  </span>
                  <ChevronDown />
                </Link>

                <Link className="employee-kpi" href="/employee/dashboard?view=orders">
                  <span className="kpi-icon purple">
                    <ClipboardList />
                  </span>
                  <span>
                    <small>My purchase orders</small>
                    <strong>{assignedOrders.length}</strong>
                  </span>
                  <ChevronDown />
                </Link>

                <Link className="employee-kpi" href="/employee/dashboard?view=shipments&status=Delayed">
                  <span className="kpi-icon red">
                    <Truck />
                  </span>
                  <span>
                    <small>Delayed shipments</small>
                    <strong>{delayedAssigned.length}</strong>
                  </span>
                  <ChevronDown />
                </Link>

                <Link className="employee-kpi" href="/employee/dashboard?view=tasks&status=Completed">
                  <span className="kpi-icon green">
                    <Check />
                  </span>
                  <span>
                    <small>Completed tasks</small>
                    <strong>{allTasks.filter((t) => t.status === 'Completed').length}</strong>
                  </span>
                  <ChevronDown />
                </Link>
              </div>

              {/* The 4 Employee Analytics Graphs */}
              <div className="employee-chart-grid">
                {/* 1. MY SHIPMENT PERFORMANCE */}
                <article className="employee-card employee-chart-card">
                  <div className="employee-card-head">
                    <div>
                      <h2>1. My Shipment Performance</h2>
                      <p>Assigned deliveries over time and on-time distribution.</p>
                    </div>
                    <RangePicker id="shipment" />
                  </div>
                  <div className="chart-pair">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartShipmentData}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={shipmentStatusPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={75}
                          cursor="pointer"
                          onClick={(entry) =>
                            router.push(
                              `/employee/dashboard?view=shipments&status=${encodeURIComponent(entry.name || '')}`
                            )
                          }
                        >
                          {shipmentStatusPie.map((entry, index) => (
                            <Cell key={entry.name} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                {/* 2. INVENTORY OVERVIEW */}
                <article className="employee-card employee-chart-card">
                  <div className="employee-card-head">
                    <div>
                      <h2>2. Inventory Overview</h2>
                      <p>Authorized warehouse stock grouped by health status.</p>
                    </div>
                    <RangePicker id="inventory" />
                  </div>
                  <div className="chart-pair">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={inventoryStatusData}
                        onClick={(entry) => {
                          if (entry?.activeLabel) {
                            router.push(
                              `/employee/dashboard?view=inventory&status=${encodeURIComponent(String(entry.activeLabel))}`
                            )
                          }
                        }}
                      >
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
                          {inventoryStatusData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={
                                entry.name === 'Healthy'
                                  ? '#16a34a'
                                  : entry.name === 'Low stock'
                                  ? '#f59e0b'
                                  : '#dc2626'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="employee-stat-list">
                      {inventoryStatusData.map((item) => (
                        <Link
                          key={item.name}
                          href={`/employee/dashboard?view=inventory&status=${encodeURIComponent(item.name)}`}
                        >
                          <span>
                            <i
                              style={{
                                background:
                                  item.name === 'Healthy'
                                    ? '#16a34a'
                                    : item.name === 'Low stock'
                                    ? '#f59e0b'
                                    : '#dc2626',
                              }}
                            />
                            {item.name}
                          </span>
                          <b>{item.value} items</b>
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>

                {/* 3. MY TASK PROGRESS */}
                <article className="employee-card employee-chart-card">
                  <div className="employee-card-head">
                    <div>
                      <h2>3. My Task Progress</h2>
                      <p>Completed versus pending operational assignments.</p>
                    </div>
                    <RangePicker id="task" />
                  </div>
                  <div className="chart-pair">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={taskTrendData}>
                        <CartesianGrid vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          name="Completed"
                          dataKey="completed"
                          stroke="#0d9488"
                          fill="#0d948833"
                        />
                        <Area
                          type="monotone"
                          name="Pending"
                          dataKey="pending"
                          stroke="#f59e0b"
                          fill="#f59e0b33"
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    <div className="employee-stat-list">
                      <Link href="/employee/dashboard?view=tasks&status=Pending">
                        <span>
                          <i className="dot amber" />
                          Pending
                        </span>
                        <b>{pendingTasks.length}</b>
                      </Link>
                      <Link href="/employee/dashboard?view=tasks&status=Completed">
                        <span>
                          <i className="dot green" />
                          Completed
                        </span>
                        <b>{allTasks.filter((t) => t.status === 'Completed').length}</b>
                      </Link>
                      <Link href="/employee/dashboard?view=tasks&status=Overdue">
                        <span>
                          <i className="dot red" />
                          Overdue
                        </span>
                        <b>
                          {allTasks.filter((t) => t.status !== 'Completed' && parseDate(t.due) < TODAY).length}
                        </b>
                      </Link>
                    </div>
                  </div>
                </article>

                {/* 4. MY DELIVERY DELAYS */}
                <article className="employee-card employee-chart-card">
                  <div className="employee-card-head">
                    <div>
                      <h2>4. My Delivery Delays</h2>
                      <p>On-time performance comparison for assigned shipments.</p>
                    </div>
                    <RangePicker id="delay" />
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={delayBarData}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar name="On Time" dataKey="onTime" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar name="Delayed" dataKey="delayed" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </article>
              </div>
            </>
          )}

          {/* VIEW: MY TASKS */}
          {view === 'tasks' && (
            <article className="employee-card employee-list-card">
              <div className="list-toolbar">
                <h2>Assigned Operational Tasks</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={taskFilter}
                    onChange={(e) => setTaskFilter(e.target.value)}
                    aria-label="Filter tasks"
                  >
                    <option value="All">All statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {allTasks
                .filter((t) => {
                  if (taskFilter === 'All') return true
                  if (taskFilter === 'Overdue') {
                    return t.status !== 'Completed' && parseDate(t.due) < TODAY
                  }
                  return t.status === taskFilter
                })
                .map((task) => (
                  <div className="employee-row task-row" key={task.id}>
                    <div>
                      <b>{task.title}</b>
                      <small>
                        {task.id} · Due {task.due} · Ref: {task.related}
                      </small>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                        {task.description}
                      </p>
                    </div>
                    <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    <span className={`status-pill ${task.status.toLowerCase().replace(' ', '-')}`}>
                      {task.status}
                    </span>
                    {task.status !== 'Completed' && (
                      <button
                        type="button"
                        className="row-action"
                        onClick={async () => {
                          await completeEmployeeTask(task.id)
                          notify(`Task ${task.id} marked complete.`)
                        }}
                      >
                        <Check /> Complete
                      </button>
                    )}
                  </div>
                ))}
            </article>
          )}

          {/* VIEW: ASSIGNED SHIPMENTS */}
          {view === 'shipments' && (
            <article className="employee-card employee-list-card">
              <div className="list-toolbar">
                <h2>My Assigned Shipments</h2>
                <span>{assignedShipments.length} assigned records</span>
              </div>

              {assignedShipments.map((s) => (
                <div className="employee-row" key={s.id}>
                  <div>
                    <b>{s.id}</b>
                    <small>
                      {s.origin} → {s.destination} · {s.carrier}
                    </small>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Expected</span>
                    <strong>{s.expected}</strong>
                  </div>
                  <span className={`status-pill ${s.status.toLowerCase().replace(' ', '-')}`}>
                    {s.status}
                  </span>
                  <button
                    type="button"
                    className="row-action"
                    onClick={() => setTrackingShipment(s)}
                  >
                    <Navigation /> Track
                  </button>
                </div>
              ))}
            </article>
          )}

          {/* VIEW: SHIPMENT TRACKING */}
          {view === 'tracking' && (
            <article className="employee-card">
              <div className="list-toolbar">
                <h2>Live Shipment Tracking Hub</h2>
                <span>Select any shipment to track milestone checkpoints</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginTop: '16px' }}>
                {assignedShipments.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b>{s.id}</b>
                      <span className={`status-pill ${s.status.toLowerCase().replace(' ', '-')}`}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      <p style={{ margin: '2px 0' }}>Route: {s.origin} → {s.destination}</p>
                      <p style={{ margin: '2px 0' }}>Carrier: {s.carrier}</p>
                      <p style={{ margin: '2px 0' }}>Expected: {s.expected}</p>
                    </div>
                    <button
                      type="button"
                      className="primary-small"
                      style={{ marginTop: '6px' }}
                      onClick={() => setTrackingShipment(s)}
                    >
                      <Navigation /> Open Tracking Map
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* VIEW: INVENTORY LOOKUP */}
          {view === 'inventory' && (
            <article className="employee-card employee-list-card">
              <div className="list-toolbar">
                <h2>Authorized Inventory Lookup</h2>
                <span>{inventoryAlerts.length} stock alerts</span>
              </div>

              {authorizedInventory.map((item) => {
                const st = inventoryStatus(item)
                return (
                  <div className="employee-row" key={item.id}>
                    <div>
                      <b>{item.name}</b>
                      <small>
                        {item.sku} · {item.category} · {item.warehouse}
                      </small>
                    </div>
                    <strong>{item.quantity.toLocaleString()} units</strong>
                    <span className={`status-pill ${st.toLowerCase().replace(' ', '-')}`}>{st}</span>
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => setInventoryItemModal(item)}
                    >
                      View Details
                    </button>
                  </div>
                )
              })}
            </article>
          )}

          {/* VIEW: MY PURCHASE ORDERS */}
          {view === 'orders' && (
            <article className="employee-card employee-list-card">
              <div className="list-toolbar">
                <h2>My Purchase Orders & Requisitions</h2>
                <button
                  type="button"
                  className="employee-primary"
                  onClick={() => setRequisitionOpen(true)}
                >
                  <Plus /> New Requisition
                </button>
              </div>

              {assignedOrders.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No purchase orders created yet. Click "New Requisition" to create one.
                </div>
              ) : (
                assignedOrders.map((o) => (
                  <div className="employee-row" key={o.id}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <b>{o.id}</b>
                        {o.requestType && o.requestType !== 'Purchase Requisition' && (
                          <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {o.requestType}
                          </span>
                        )}
                      </div>
                      <small>
                        {o.supplier} · {o.category} · {o.quantity} units · Date: {o.date}
                        {o.rejectionReason && (
                          <span style={{ display: 'block', color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                            Rejection Reason: {o.rejectionReason}
                          </span>
                        )}
                        {o.notes && (
                          <span style={{ display: 'block', color: '#64748b', fontStyle: 'italic', marginTop: '1px' }}>
                            Notes: {o.notes}
                          </span>
                        )}
                      </small>
                    </div>
                    <strong>${(o.quantity * o.unitPrice).toLocaleString()}</strong>
                    <span className={`status-pill ${o.status.toLowerCase()}`}>{o.status}</span>
                    <button
                      type="button"
                      className="row-action"
                      onClick={() =>
                        notify(
                          `Order ${o.id}: ${o.quantity} units (${o.status}). ${
                            o.rejectionReason ? `Reason: ${o.rejectionReason}` : ''
                          }`
                        )
                      }
                    >
                      Details
                    </button>
                  </div>
                ))
              )}
            </article>
          )}

          {/* VIEW: NOTIFICATIONS */}
          {view === 'notifications' && (
            <article className="employee-card employee-list-card">
              <div className="list-toolbar">
                <h2>Operational Notifications</h2>
                <button
                  type="button"
                  className="employee-secondary"
                  onClick={async () => {
                    await markAllNotificationsRead()
                    notify('All notifications marked as read.')
                  }}
                >
                  <Check /> Mark all as read
                </button>
              </div>

              {allNotifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  className="notification-row"
                  onClick={async () => {
                    await markNotificationRead(notif.id)
                    notify(`Opened: ${notif.title}`)
                  }}
                >
                  <span className={`notification-status ${notif.read ? '' : 'unread'}`} />
                  <div>
                    <b>{notif.title}</b>
                    <small>
                      {notif.timeAgo} · {notif.category}
                    </small>
                    <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '12px' }}>
                      {notif.detail}
                    </p>
                  </div>
                  <ChevronDown />
                </button>
              ))}
            </article>
          )}

          {/* VIEW: MY PROFILE (Fixed Jordan Lee profile) */}
          {view === 'profile' && (
            <div className="employee-profile-grid">
              <article className="employee-card profile-card">
                <div className="profile-large avatar">{userInitials}</div>
                <h2>{user?.name || 'Jordan Lee'}</h2>
                <p>Operations Associate</p>
                <dl>
                  <dt>Employee ID</dt>
                  <dd>EMP-2084</dd>
                  <dt>Department</dt>
                  <dd>Fulfillment & Receiving</dd>
                  <dt>Primary Hub</dt>
                  <dd>East Hub Facility</dd>
                  <dt>Work Email</dt>
                  <dd>{user?.email || 'employee@chainsight.demo'}</dd>
                </dl>
              </article>

              <article className="employee-card settings-card">
                <h2>Notification Preferences</h2>
                <label>
                  <span>Delivery Deadlines & Urgent Freight</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label>
                  <span>Inventory Reorder Alerts</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label>
                  <span>New Operational Task Assignments</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <button
                  type="button"
                  className="employee-primary"
                  onClick={() => notify('Notification preferences saved.')}
                >
                  Save Preferences
                </button>
              </article>
            </div>
          )}

          {/* MODAL: SHIPMENT TRACKING TIMELINE */}
          {trackingShipment && (
            <div className="recovery-backdrop" role="presentation" onClick={() => setTrackingShipment(null)}>
              <div
                className="recovery-dialog"
                role="dialog"
                aria-modal="true"
                style={{ width: 'min(100%, 500px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="recovery-close"
                  onClick={() => setTrackingShipment(null)}
                  aria-label="Close tracking"
                >
                  <X />
                </button>

                <p className="login-eyebrow">LIVE SHIPMENT TRACKING</p>
                <h2 style={{ fontSize: '1.3rem', margin: '0 0 12px' }}>
                  {trackingShipment.id} · {trackingShipment.carrier}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Origin</span>
                    <b>{trackingShipment.origin}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Destination</span>
                    <b>{trackingShipment.destination}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Expected</span>
                    <b>{trackingShipment.expected}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Current Status</span>
                    <span className={`status-pill ${trackingShipment.status.toLowerCase().replace(' ', '-')}`}>
                      {trackingShipment.status}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ borderLeft: '2px solid #2563eb', paddingLeft: '14px', marginLeft: '6px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                  <div>
                    <b style={{ color: '#2563eb' }}>Checkpoint 1: Dispatched</b>
                    <p style={{ margin: '2px 0', color: '#64748b' }}>
                      Departed {trackingShipment.origin} on {trackingShipment.dispatch}
                    </p>
                  </div>
                  <div>
                    <b style={{ color: '#2563eb' }}>Checkpoint 2: Carrier Sorting</b>
                    <p style={{ margin: '2px 0', color: '#64748b' }}>
                      Processed at {trackingShipment.carrier} transit hub
                    </p>
                  </div>
                  <div>
                    <b style={{ color: trackingShipment.status === 'On time' ? '#16a34a' : '#d97706' }}>
                      Checkpoint 3: Final Delivery
                    </b>
                    <p style={{ margin: '2px 0', color: '#64748b' }}>
                      {trackingShipment.actual
                        ? `Delivered on ${trackingShipment.actual}`
                        : `Scheduled delivery to ${trackingShipment.destination}`}
                    </p>
                  </div>
                </div>

                {/* Status Action */}
                <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="primary-small"
                    onClick={async () => {
                      await updateShipmentStatus(trackingShipment.id, 'On time', TODAY.toISOString().split('T')[0])
                      notify(`Shipment ${trackingShipment.id} confirmed delivered on time.`)
                      setTrackingShipment(null)
                    }}
                  >
                    Confirm Delivery
                  </button>
                  <button
                    type="button"
                    className="filter-button"
                    onClick={async () => {
                      await updateShipmentStatus(trackingShipment.id, 'Delayed')
                      notify(`Shipment ${trackingShipment.id} logged as delayed.`)
                      setTrackingShipment(null)
                    }}
                  >
                    Report Delay
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: CREATE REQUISITION */}
          {requisitionOpen && (
            <div className="recovery-backdrop" role="presentation" onClick={() => setRequisitionOpen(false)}>
              <div
                className="recovery-dialog"
                role="dialog"
                aria-modal="true"
                style={{ width: 'min(100%, 460px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="recovery-close"
                  onClick={() => setRequisitionOpen(false)}
                  aria-label="Close"
                >
                  <X />
                </button>

                <p className="login-eyebrow">REQUISITION WORKFLOW</p>
                <h2 style={{ fontSize: '1.3rem', margin: '0 0 12px' }}>Create Purchase Requisition</h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                  Requisition will be submitted for manager approval.
                </p>

                <form onSubmit={handleCreateRequisition} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="login-field">
                    <label>Request Type</label>
                    <select
                      value={reqType}
                      onChange={(e) => setReqType(e.target.value)}
                      style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                    >
                      <option value="Purchase Requisition">Purchase Requisition</option>
                      <option value="Inventory Replenishment">Inventory Replenishment</option>
                      <option value="Emergency Restock">Emergency Restock</option>
                    </select>
                  </div>

                  <div className="login-field">
                    <label>Inventory Category</label>
                    <select
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="login-field">
                    <label>Preferred Supplier</label>
                    <select
                      value={reqSupplier}
                      onChange={(e) => setReqSupplier(e.target.value)}
                      style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                    >
                      {allSuppliers.slice(0, 10).map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="login-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={reqQty}
                        onChange={(e) => setReqQty(Number(e.target.value))}
                        required
                        style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                      />
                    </div>
                    <div className="login-field">
                      <label>Est. Unit Price ($)</label>
                      <input
                        type="number"
                        min="1"
                        value={reqPrice}
                        onChange={(e) => setReqPrice(Number(e.target.value))}
                        required
                        style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label>Operational Justification / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Critical stock replenishment for Hub West"
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      style={{ height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 10px', width: '100%' }}
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                    Total Requisition Value: <b>${(reqQty * reqPrice).toLocaleString()}</b>
                  </div>

                  <button
                    type="submit"
                    className="login-submit"
                    style={{ marginTop: '8px', opacity: isSubmitting ? 0.7 : 1 }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting to Manager...' : 'Submit Requisition'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: INVENTORY ITEM LOOKUP DETAILS */}
          {inventoryItemModal && (
            <div className="recovery-backdrop" role="presentation" onClick={() => setInventoryItemModal(null)}>
              <div
                className="recovery-dialog"
                role="dialog"
                aria-modal="true"
                style={{ width: 'min(100%, 460px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="recovery-close"
                  onClick={() => setInventoryItemModal(null)}
                  aria-label="Close"
                >
                  <X />
                </button>

                <p className="login-eyebrow">INVENTORY SPECIFICATION</p>
                <h2 style={{ fontSize: '1.3rem', margin: '0 0 12px' }}>{inventoryItemModal.name}</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SKU</span>
                    <b>{inventoryItemModal.sku}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Warehouse</span>
                    <b>{inventoryItemModal.warehouse}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Category</span>
                    <b>{inventoryItemModal.category}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Stock Level</span>
                    <b>{inventoryItemModal.quantity.toLocaleString()} units</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Reorder Threshold</span>
                    <b>{inventoryItemModal.reorderPoint} units</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Stock Status</span>
                    <span className={`status-pill ${inventoryStatus(inventoryItemModal).toLowerCase().replace(' ', '-')}`}>
                      {inventoryStatus(inventoryItemModal)}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="filter-button"
                    onClick={() => setInventoryItemModal(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="primary-small"
                    onClick={() => {
                      const item = inventoryItemModal
                      setReqCategory(item.category)
                      setReqType('Inventory Replenishment')
                      setReqQty(Math.max(50, item.reorderPoint))
                      setReqPrice(item.unitCost)
                      setReqNotes(`Replenishment for ${item.name} (${item.sku}) at ${item.warehouse}`)
                      setInventoryItemModal(null)
                      setRequisitionOpen(true)
                    }}
                  >
                    Request Replenishment
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
