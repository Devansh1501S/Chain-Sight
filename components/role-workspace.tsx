'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  LogOut,
  Menu,
  Package,
  Search,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { can, getSession, signOut, type Role } from '../lib/auth'
import {
  approvePurchaseOrder,
  calculateOnTimeRate,
  exportCsv,
  getInventory,
  getPurchaseOrders,
  getShipments,
  inventoryStatus,
  inventoryValue,
  rejectPurchaseOrder,
  subscribeData,
} from '../lib/mock-data'
import OverviewAnalytics from './overview-analytics'
import ManagerSidebar from './manager-sidebar'

export default function RoleWorkspace({ role }: { role: Role }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [, setTick] = useState(0)

  useEffect(() => {
    setMounted(true)
    return subscribeData(() => setTick((t) => t + 1))
  }, [])

  const session = mounted ? getSession() : null
  const user = session?.user

  const notify = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const handleSignOut = () => {
    signOut()
    setProfileOpen(false)
    router.push('/')
  }

  const handleApprove = async (id: string) => {
    const success = await approvePurchaseOrder(id, user?.id || 'usr-manager', user?.name || 'Alex Chen')
    if (success) {
      notify(`Purchase order ${id} approved successfully.`)
    } else {
      notify(`Could not approve order ${id}.`)
    }
  }

  const handleReject = async (id: string) => {
    const success = await rejectPurchaseOrder(id, user?.id || 'usr-manager', user?.name || 'Alex Chen', 'Manager rejected during review.')
    if (success) {
      notify(`Purchase order ${id} rejected.`)
    } else {
      notify(`Could not reject order ${id}.`)
    }
  }

  const inventoryList = getInventory()
  const shipmentsList = getShipments()
  const ordersList = getPurchaseOrders()

  const totalInvValue = inventoryValue(inventoryList)
  const atRiskCount = inventoryList.filter((item) => inventoryStatus(item) !== 'Healthy').length
  const onTimeRate = calculateOnTimeRate(shipmentsList)
  const pendingOrders = ordersList.filter((order) => order.status === 'Pending')

  // While mounting on client
  if (!mounted) {
    return (
      <div className="role-shell">
        <main className="access-state">
          <p>Loading workspace...</p>
        </main>
      </div>
    )
  }

  // Access control
  if (!session || session.user.role !== role) {
    return (
      <main className="access-state">
        <h1>Access denied</h1>
        <p>This workspace requires a {role.toLowerCase()} session.</p>
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
    : 'AC'

  return (
    <div className="role-shell">
      <ManagerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="role-content">
        {/* Topbar */}
        <header className="role-topbar">
          <button
            type="button"
            className="role-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open manager menu"
          >
            <Menu />
          </button>

          <div className="crumbs">
            <span>Workspace</span>
            <ChevronRight />
            <b>Executive Overview</b>
          </div>

          <div className="role-tools">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              onClick={() => notify(`${pendingOrders.length} pending purchase orders require review.`)}
            >
              <Bell />
              {pendingOrders.length > 0 && <span className="notification-dot">{pendingOrders.length}</span>}
            </button>

            {/* Profile Menu */}
            <div className="profile-menu">
              <button
                type="button"
                className="profile-trigger"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar">{userInitials}</span>
                <span className="profile-name">{user?.name || 'Alex Chen'}</span>
                <ChevronRight className={`profile-chevron ${profileOpen ? 'open' : ''}`} />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <span className="avatar">{userInitials}</span>
                    <div>
                      <b>{user?.name}</b>
                      <small>Manager · Operations Lead</small>
                    </div>
                  </div>
                  <Link href="/dashboard/settings" onClick={() => setProfileOpen(false)}>
                    Workspace Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      exportCsv('manager-overview-summary.csv', ordersList as unknown as Record<string, unknown>[])
                      setProfileOpen(false)
                      notify('Overview summary exported.')
                    }}
                  >
                    Export Overview Data
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

        {/* Main Content */}
        <main className="role-main">
          <div className="role-heading">
            <div>
              <p className="eyebrow blue">MANAGER WORKSPACE</p>
              <h1>Executive Overview</h1>
              <p>A connected view of your global supply chain, inventory health, and logistics performance.</p>
            </div>
            <div className="heading-actions">
              <span className="demo-pill">DEMO MODE</span>
              <button
                type="button"
                className="primary-small"
                onClick={() => {
                  exportCsv('chainsight-executive-overview.csv', [
                    {
                      Metric: 'Total Inventory Value',
                      Value: `$${(totalInvValue / 1000000).toFixed(2)}M`,
                    },
                    { Metric: 'At-risk Inventory Items', Value: atRiskCount },
                    { Metric: 'On-time Delivery Rate', Value: `${onTimeRate}%` },
                    { Metric: 'Pending Approvals', Value: pendingOrders.length },
                  ])
                  notify('Executive summary exported.')
                }}
              >
                <Download />
                <span>Export Summary</span>
              </button>
            </div>
          </div>

          {/* Feedback Notice */}
          {notice && (
            <div className="role-notice" role="status">
              <Check />
              <span>{notice}</span>
            </div>
          )}

          {/* 4 Executive KPI Cards */}
          <div className="role-kpis">
            <Link href="/dashboard/inventory" className="kpi-card">
              <div className="kpi-label">
                <span>TOTAL INVENTORY VALUE</span>
                <Package />
              </div>
              <strong>${(totalInvValue / 1000000).toFixed(2)}M</strong>
              <span>
                <Check />
                {inventoryList.length} items tracked
              </span>
            </Link>

            <Link href="/dashboard/inventory" className="kpi-card">
              <div className="kpi-label">
                <span>INVENTORY AT RISK</span>
                <ClipboardList />
              </div>
              <strong className={atRiskCount > 0 ? 'text-amber' : ''}>{atRiskCount} items</strong>
              <span className={atRiskCount > 0 ? 'text-amber' : ''}>
                {inventoryList.filter((i) => i.quantity === 0).length} stockouts
              </span>
            </Link>

            <Link href="/dashboard/logistics" className="kpi-card">
              <div className="kpi-label">
                <span>ON-TIME DELIVERY RATE</span>
                <Truck />
              </div>
              <strong className="text-green">{onTimeRate}%</strong>
              <span>Across all carriers</span>
            </Link>

            <Link href="/dashboard/orders" className="kpi-card">
              <div className="kpi-label">
                <span>PENDING APPROVALS</span>
                <Users />
              </div>
              <strong className={pendingOrders.length > 0 ? 'text-blue' : ''}>{pendingOrders.length} orders</strong>
              <span>Action required below</span>
            </Link>
          </div>

          {/* The 5 Overview Analytics Graphs */}
          <OverviewAnalytics />

          {/* Control Center: Real Purchase Order Approvals */}
          <section className="role-panel" style={{ marginTop: '28px' }}>
            <div className="role-panel-head">
              <div>
                <p className="eyebrow blue">CONTROL CENTER</p>
                <h2>Purchase Order Approvals</h2>
              </div>
              <span className="badge warning">{pendingOrders.length} pending review</span>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px', textAlign: 'center' }}>
                <Check style={{ color: '#16a34a', width: '28px', height: '28px', margin: '0 auto 8px' }} />
                <b>All purchase orders have been reviewed</b>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
                  No pending approvals in this session.
                </p>
              </div>
            ) : (
              <div className="role-table">
                <div className="role-row role-row-head">
                  <span>Order ID</span>
                  <span>Supplier</span>
                  <span>Category</span>
                  <span>Amount</span>
                  <span>Actions</span>
                </div>
                {pendingOrders.slice(0, 8).map((order) => (
                  <div className="role-row" key={order.id}>
                    <div>
                      <b>{order.id}</b>
                      {order.requestType && order.requestType !== 'Purchase Requisition' && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>
                          {order.requestType}
                        </span>
                      )}
                    </div>
                    <div>
                      <span>{order.supplier}</span>
                      <small style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                        Req by: {order.requesterName || 'Jordan Lee'} · {order.quantity} units
                      </small>
                    </div>
                    <span>{order.category}</span>
                    <span>${(order.quantity * order.unitPrice).toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="primary-small"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => handleApprove(order.id)}
                      >
                        <Check /> Approve
                      </button>
                      <button
                        type="button"
                        className="filter-button"
                        style={{ padding: '6px 10px', fontSize: '11px', color: '#dc2626' }}
                        onClick={() => handleReject(order.id)}
                      >
                        <X /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
