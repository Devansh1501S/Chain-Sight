'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Search,
  SlidersHorizontal,
  Truck,
  Users,
  X,
} from 'lucide-react'
import ManagerSidebar from '../../../components/manager-sidebar'
import { getSession, signOut } from '../../../lib/auth'
import {
  approvePurchaseOrder,
  categories,
  carriers,
  exportCsv,
  getInventory,
  getPurchaseOrders,
  getShipments,
  getSuppliers,
  inventoryStatus,
  inventoryValue,
  isShipmentDelayed,
  procurementSpend,
  rejectPurchaseOrder,
  subscribeData,
  updateInventoryStock,
  updatePurchaseOrderStatus,
  updateShipmentStatus,
  updateSupplierStatus,
  warehouses,
  type InventoryItem,
  type PurchaseOrder,
  type Shipment,
  type Supplier,
} from '../../../lib/mock-data'

const configs: Record<
  string,
  { title: string; eyebrow: string; description: string }
> = {
  inventory: {
    title: 'Inventory',
    eyebrow: 'OPERATIONS / INVENTORY',
    description: 'Monitor stock health, working capital, and replenishment signals across all fulfillment centers.',
  },
  logistics: {
    title: 'Logistics',
    eyebrow: 'OPERATIONS / LOGISTICS',
    description: 'Track global shipments, carrier lanes, transit checkpoints, and delivery exceptions.',
  },
  procurement: {
    title: 'Procurement',
    eyebrow: 'OPERATIONS / PROCUREMENT',
    description: 'Manage purchase requisitions, track operational spend, and monitor category allocations.',
  },
  suppliers: {
    title: 'Suppliers',
    eyebrow: 'NETWORK / SUPPLIERS',
    description: 'Evaluate vendor reliability, quality compliance, and total category exposure.',
  },
  orders: {
    title: 'Purchase Orders',
    eyebrow: 'MANAGE / PURCHASE ORDERS',
    description: 'Review purchasing workflows, order statuses, and execute manager approvals.',
  },
  reports: {
    title: 'Reports',
    eyebrow: 'MANAGE / REPORTS',
    description: 'Generate focused exports and compliance reports from the active operating picture.',
  },
  settings: {
    title: 'Settings',
    eyebrow: 'MANAGE / SETTINGS',
    description: 'Configure workspace preferences, threshold notifications, and team profiles.',
  },
}

export default function DetailPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { section } = use(params)

  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [, setTick] = useState(0)

  // Filters & Search
  const initialCategoryParam = searchParams.get('category') || 'All'
  const initialStatusParam = searchParams.get('status') || 'All'
  const initialCarrierParam = searchParams.get('carrier') || 'All'
  const initialSupplierParam = searchParams.get('supplier') || 'All'

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatusParam)
  const [secondaryFilter, setSecondaryFilter] = useState(
    section === 'inventory' ? initialCategoryParam : section === 'logistics' ? initialCarrierParam : 'All'
  )
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Sorting state
  const [sortField, setSortField] = useState<string>('')
  const [sortAsc, setSortAsc] = useState<boolean>(true)

  // Modal inspection state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [modalType, setModalType] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<number>(0)

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

  const config = configs[section] || configs.inventory

  const inventoryData = getInventory()
  const shipmentsData = getShipments()
  const suppliersData = getSuppliers()
  const ordersData = getPurchaseOrders()

  // Base rows calculation
  const rawRows = useMemo(() => {
    const q = query.toLowerCase()

    if (section === 'inventory') {
      return inventoryData.filter((item) => {
        const matchesQuery =
          item.sku.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q)
        const st = inventoryStatus(item)
        const matchesStatus = statusFilter === 'All' || st === statusFilter
        const matchesCategory = secondaryFilter === 'All' || item.category === secondaryFilter
        return matchesQuery && matchesStatus && matchesCategory
      })
    }

    if (section === 'logistics') {
      return shipmentsData.filter((item) => {
        const matchesQuery =
          item.id.toLowerCase().includes(q) ||
          item.orderId.toLowerCase().includes(q) ||
          item.destination.toLowerCase().includes(q) ||
          item.carrier.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter
        const matchesCarrier = secondaryFilter === 'All' || item.carrier === secondaryFilter
        return matchesQuery && matchesStatus && matchesCarrier
      })
    }

    if (section === 'suppliers') {
      return suppliersData.filter((item) => {
        const matchesQuery =
          item.name.toLowerCase().includes(q) ||
          item.region.toLowerCase().includes(q) ||
          item.contact.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter
        const matchesRegion = secondaryFilter === 'All' || item.region === secondaryFilter
        return matchesQuery && matchesStatus && matchesRegion
      })
    }

    if (section === 'orders') {
      return ordersData.filter((item) => {
        const matchesQuery =
          item.id.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter
        const matchesCategory = secondaryFilter === 'All' || item.category === secondaryFilter
        return matchesQuery && matchesStatus && matchesCategory
      })
    }

    return []
  }, [section, inventoryData, shipmentsData, suppliersData, ordersData, query, statusFilter, secondaryFilter])

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortField) return rawRows
    return [...rawRows].sort((a: any, b: any) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })
  }, [rawRows, sortField, sortAsc])

  // Pagination
  const totalRows = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const handleExport = () => {
    exportCsv(`${section}-export.csv`, sortedRows as unknown as Record<string, unknown>[])
    notify(`Exported ${sortedRows.length} records to ${section}-export.csv.`)
  }

  const openDetails = (record: any) => {
    setSelectedRecord(record)
    setModalType(section)
    if (section === 'inventory') setEditQty(record.quantity)
  }

  const closeDetails = () => {
    setSelectedRecord(null)
    setModalType(null)
  }

  // Client mounting
  if (!mounted) {
    return (
      <div className="app-shell">
        <main className="access-state">
          <p>Loading {config.title}...</p>
        </main>
      </div>
    )
  }

  // Role validation
  if (!session || session.user.role !== 'MANAGER') {
    return (
      <main className="access-state">
        <h1>Access denied</h1>
        <p>This workspace requires a manager session.</p>
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
    <div className="app-shell">
      <ManagerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-content">
        {/* Topbar */}
        <header className="app-topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open manager menu"
          >
            <Menu aria-hidden="true" />
          </button>

          <div className="crumbs">
            <Link href="/manager/dashboard" style={{ color: '#64748b' }}>
              Workspace
            </Link>
            <ChevronRight />
            <b>{config.title}</b>
          </div>

          <div className="top-actions">
            <div className="profile-menu">
              <button
                type="button"
                className="profile-trigger"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar">{userInitials}</span>
                <span className="profile-name">{user?.name}</span>
                <ChevronRight className={`profile-chevron ${profileOpen ? 'open' : ''}`} />
              </button>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <span className="avatar">{userInitials}</span>
                    <div>
                      <b>{user?.name}</b>
                      <small>Manager</small>
                    </div>
                  </div>
                  <Link href="/manager/dashboard" onClick={() => setProfileOpen(false)}>
                    Executive Overview
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setProfileOpen(false)}>
                    Workspace Settings
                  </Link>
                  <button type="button" className="profile-signout" onClick={handleSignOut}>
                    <LogOut />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {/* Page Heading */}
          <div className="page-heading">
            <div>
              <p className="eyebrow blue">{config.eyebrow}</p>
              <h1>{config.title}</h1>
              <span>{config.description}</span>
            </div>
            <div className="heading-actions">
              {section !== 'settings' && section !== 'reports' && (
                <button type="button" className="primary-small" onClick={handleExport}>
                  <Download />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback notice */}
          {notice && (
            <div className="role-notice" role="status">
              <Check />
              <span>{notice}</span>
            </div>
          )}

          {/* Section Routing */}
          {section === 'reports' ? (
            <ReportsPanel notify={notify} />
          ) : section === 'settings' ? (
            <SettingsPanel notify={notify} user={user} />
          ) : section === 'procurement' ? (
            <ProcurementPanel
              orders={ordersData}
              suppliers={suppliersData}
              notify={notify}
              onApprove={async (id) => {
                const ok = await approvePurchaseOrder(id, user?.id || 'usr-manager', user?.name || 'Alex Chen')
                if (ok) {
                  notify(`Order ${id} approved.`)
                } else {
                  notify(`Could not approve order ${id}.`)
                }
              }}
              onReject={async (id) => {
                const ok = await rejectPurchaseOrder(id, user?.id || 'usr-manager', user?.name || 'Alex Chen', 'Manager rejected during procurement review.')
                if (ok) {
                  notify(`Order ${id} rejected.`)
                } else {
                  notify(`Could not reject order ${id}.`)
                }
              }}
            />
          ) : (
            /* Tables for Inventory, Logistics, Suppliers, Purchase Orders */
            <>
              {/* Toolbar */}
              <div className="table-toolbar">
                <label className="table-search">
                  <Search />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setPage(1)
                    }}
                    placeholder={`Search ${config.title.toLowerCase()}...`}
                    aria-label={`Search ${config.title.toLowerCase()}`}
                  />
                </label>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  {section === 'inventory' && (
                    <>
                      <option value="Healthy">Healthy</option>
                      <option value="Low stock">Low stock</option>
                      <option value="Stockout">Stockout</option>
                    </>
                  )}
                  {section === 'logistics' && (
                    <>
                      <option value="On time">On time</option>
                      <option value="Delayed">Delayed</option>
                      <option value="In transit">In transit</option>
                    </>
                  )}
                  {section === 'suppliers' && (
                    <>
                      <option value="Active">Active</option>
                      <option value="Review">Review</option>
                    </>
                  )}
                  {section === 'orders' && (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Ordered">Ordered</option>
                      <option value="Received">Received</option>
                    </>
                  )}
                </select>

                {/* Secondary Dropdown */}
                {section === 'inventory' && (
                  <select
                    value={secondaryFilter}
                    onChange={(e) => {
                      setSecondaryFilter(e.target.value)
                      setPage(1)
                    }}
                    aria-label="Filter by category"
                  >
                    <option value="All">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                {section === 'logistics' && (
                  <select
                    value={secondaryFilter}
                    onChange={(e) => {
                      setSecondaryFilter(e.target.value)
                      setPage(1)
                    }}
                    aria-label="Filter by carrier"
                  >
                    <option value="All">All carriers</option>
                    {carriers.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                {section === 'suppliers' && (
                  <select
                    value={secondaryFilter}
                    onChange={(e) => {
                      setSecondaryFilter(e.target.value)
                      setPage(1)
                    }}
                    aria-label="Filter by region"
                  >
                    <option value="All">All regions</option>
                    <option value="North America">North America</option>
                    <option value="Europe">Europe</option>
                    <option value="Asia Pacific">Asia Pacific</option>
                  </select>
                )}

                {(query || statusFilter !== 'All' || secondaryFilter !== 'All') && (
                  <button
                    type="button"
                    className="filter-clear"
                    onClick={() => {
                      setQuery('')
                      setStatusFilter('All')
                      setSecondaryFilter('All')
                      setPage(1)
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Data Table */}
              <div className="data-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {section === 'inventory' && (
                        <>
                          <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>
                            SKU <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                            Product Name <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                            Category <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('warehouse')} style={{ cursor: 'pointer' }}>
                            Warehouse <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                            On Hand <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('unitCost')} style={{ cursor: 'pointer' }}>
                            Unit Cost <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th>Status</th>
                          <th>Action</th>
                        </>
                      )}

                      {section === 'logistics' && (
                        <>
                          <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                            Shipment ID <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('orderId')} style={{ cursor: 'pointer' }}>
                            Order Ref <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('origin')} style={{ cursor: 'pointer' }}>
                            Route <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('carrier')} style={{ cursor: 'pointer' }}>
                            Carrier <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('expected')} style={{ cursor: 'pointer' }}>
                            Expected Date <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('cost')} style={{ cursor: 'pointer' }}>
                            Freight Cost <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th>Status</th>
                          <th>Action</th>
                        </>
                      )}

                      {section === 'suppliers' && (
                        <>
                          <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                            Supplier Name <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('region')} style={{ cursor: 'pointer' }}>
                            Region <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('reliability')} style={{ cursor: 'pointer' }}>
                            Reliability <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('defectRate')} style={{ cursor: 'pointer' }}>
                            Defect Rate <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('spend')} style={{ cursor: 'pointer' }}>
                            YTD Spend <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th>Status</th>
                          <th>Action</th>
                        </>
                      )}

                      {section === 'orders' && (
                        <>
                          <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                            PO ID <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('supplier')} style={{ cursor: 'pointer' }}>
                            Supplier <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                            Category <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                            Quantity <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th>Total Value</th>
                          <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                            Date <ArrowUpDown style={{ width: '12px' }} />
                          </th>
                          <th>Status</th>
                          <th>Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row: any) => {
                      if (section === 'inventory') {
                        const st = inventoryStatus(row)
                        return (
                          <tr key={row.id}>
                            <td>
                              <b>{row.sku}</b>
                            </td>
                            <td>{row.name}</td>
                            <td>{row.category}</td>
                            <td>{row.warehouse}</td>
                            <td>{row.quantity.toLocaleString()}</td>
                            <td>${row.unitCost}</td>
                            <td>
                              <span
                                className={`status-pill ${st.toLowerCase().replace(' ', '-')}`}
                              >
                                {st}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => openDetails(row)}
                                aria-label={`View details for ${row.sku}`}
                              >
                                <Eye /> View
                              </button>
                            </td>
                          </tr>
                        )
                      }

                      if (section === 'logistics') {
                        return (
                          <tr key={row.id}>
                            <td>
                              <b>{row.id}</b>
                            </td>
                            <td>{row.orderId}</td>
                            <td>
                              {row.origin} → {row.destination}
                            </td>
                            <td>{row.carrier}</td>
                            <td>{row.expected}</td>
                            <td>${row.cost.toLocaleString()}</td>
                            <td>
                              <span
                                className={`status-pill ${row.status.toLowerCase().replace(' ', '-')}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => openDetails(row)}
                                aria-label={`View details for ${row.id}`}
                              >
                                <Eye /> Details
                              </button>
                            </td>
                          </tr>
                        )
                      }

                      if (section === 'suppliers') {
                        return (
                          <tr key={row.id}>
                            <td>
                              <b>{row.name}</b>
                            </td>
                            <td>{row.region}</td>
                            <td>
                              <strong className="text-green">{row.reliability}%</strong>
                            </td>
                            <td>{row.defectRate}%</td>
                            <td>${row.spend.toLocaleString()}</td>
                            <td>
                              <span
                                className={`status-pill ${row.status.toLowerCase()}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => openDetails(row)}
                                aria-label={`View supplier ${row.name}`}
                              >
                                <Eye /> Details
                              </button>
                            </td>
                          </tr>
                        )
                      }

                      if (section === 'orders') {
                        return (
                          <tr key={row.id}>
                            <td>
                              <b>{row.id}</b>
                              {row.requestType && row.requestType !== 'Purchase Requisition' && (
                                <span style={{ display: 'block', fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>
                                  {row.requestType}
                                </span>
                              )}
                            </td>
                            <td>
                              <div>{row.supplier}</div>
                              <small style={{ color: '#64748b', fontSize: '11px' }}>
                                By: {row.requesterName || 'Jordan Lee'}
                              </small>
                            </td>
                            <td>{row.category}</td>
                            <td>{row.quantity.toLocaleString()}</td>
                            <td>${(row.quantity * row.unitPrice).toLocaleString()}</td>
                            <td>{row.date}</td>
                            <td>
                              <span
                                className={`status-pill ${row.status.toLowerCase()}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="row-action"
                                  onClick={() => openDetails(row)}
                                  aria-label={`View order ${row.id}`}
                                >
                                  <Eye />
                                </button>
                                {row.status === 'Pending' && (
                                  <>
                                    <button
                                      type="button"
                                      className="primary-small"
                                      style={{ padding: '5px 8px', fontSize: '11px' }}
                                      onClick={async () => {
                                        const ok = await approvePurchaseOrder(row.id, user?.id || 'usr-manager', user?.name || 'Alex Chen')
                                        if (ok) {
                                          notify(`Order ${row.id} approved.`)
                                        } else {
                                          notify(`Could not approve order ${row.id}.`)
                                        }
                                      }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="filter-button"
                                      style={{ padding: '5px 8px', fontSize: '11px', color: '#dc2626' }}
                                      onClick={async () => {
                                        const ok = await rejectPurchaseOrder(row.id, user?.id || 'usr-manager', user?.name || 'Alex Chen', 'Manager rejected during orders review.')
                                        if (ok) {
                                          notify(`Order ${row.id} rejected.`)
                                        } else {
                                          notify(`Could not reject order ${row.id}.`)
                                        }
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return null
                    })}
                  </tbody>
                </table>

                {!pagedRows.length && (
                  <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    <Search style={{ width: '28px', height: '28px', color: '#94a3b8', margin: '0 auto 8px' }} />
                    <b>No matching records found</b>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
                      Try adjusting your search criteria or resetting filters.
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalRows > 0 && (
                <div className="table-footer">
                  <span>
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRows)} of {totalRows} records
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft />
                    </button>
                    <span style={{ fontSize: '12px', padding: '0 8px', color: '#64748b' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Details Modal */}
          {selectedRecord && (
            <div className="recovery-backdrop" role="presentation" onClick={closeDetails}>
              <div
                className="recovery-dialog"
                role="dialog"
                aria-modal="true"
                style={{ width: 'min(100%, 520px)', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="recovery-close"
                  onClick={closeDetails}
                  aria-label="Close dialog"
                >
                  <X />
                </button>

                <p className="login-eyebrow">RECORD INSPECTOR</p>
                <h2 style={{ fontSize: '1.4rem', margin: '0 0 16px' }}>
                  {modalType === 'inventory'
                    ? selectedRecord.name
                    : modalType === 'logistics'
                    ? `Shipment ${selectedRecord.id}`
                    : modalType === 'suppliers'
                    ? selectedRecord.name
                    : `Order ${selectedRecord.id}`}
                </h2>

                {/* Inventory Modal Details */}
                {modalType === 'inventory' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>SKU</span>
                        <b>{selectedRecord.sku}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Warehouse</span>
                        <b>{selectedRecord.warehouse}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Category</span>
                        <b>{selectedRecord.category}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Unit Cost</span>
                        <b>${selectedRecord.unitCost}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Reorder Point</span>
                        <b>{selectedRecord.reorderPoint} units</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Total Asset Value</span>
                        <b>${(selectedRecord.quantity * selectedRecord.unitCost).toLocaleString()}</b>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                        Adjust Available Stock Level
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.target.value))}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            width: '120px',
                          }}
                        />
                        <button
                          type="button"
                          className="primary-small"
                          onClick={async () => {
                            await updateInventoryStock(selectedRecord.id, editQty)
                            notify(`Stock for ${selectedRecord.sku} updated to ${editQty} units.`)
                            closeDetails()
                          }}
                        >
                          Save Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logistics Modal Details */}
                {modalType === 'logistics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Carrier</span>
                        <b>{selectedRecord.carrier}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Purchase Order</span>
                        <b>{selectedRecord.orderId}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Origin Hub</span>
                        <b>{selectedRecord.origin}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Destination</span>
                        <b>{selectedRecord.destination}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Dispatched</span>
                        <b>{selectedRecord.dispatch}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Expected Delivery</span>
                        <b>{selectedRecord.expected}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Actual Delivery</span>
                        <b>{selectedRecord.actual || 'In transit'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Freight Cost</span>
                        <b>${selectedRecord.cost.toLocaleString()}</b>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                        Update Delivery Status
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['On time', 'Delayed', 'In transit'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={selectedRecord.status === st ? 'primary-small' : 'filter-button'}
                            style={{ padding: '6px 12px' }}
                            onClick={async () => {
                              await updateShipmentStatus(selectedRecord.id, st)
                              notify(`Shipment ${selectedRecord.id} status updated to ${st}.`)
                              closeDetails()
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Suppliers Modal Details */}
                {modalType === 'suppliers' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Region</span>
                        <b>{selectedRecord.region}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Contact Email</span>
                        <b>{selectedRecord.contact}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Reliability Score</span>
                        <b className="text-green">{selectedRecord.reliability}%</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Defect Rate</span>
                        <b>{selectedRecord.defectRate}%</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>YTD Spend</span>
                        <b>${selectedRecord.spend.toLocaleString()}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Status</span>
                        <span className={`status-pill ${selectedRecord.status.toLowerCase()}`}>
                          {selectedRecord.status}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                        Manage Supplier Status
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className={selectedRecord.status === 'Active' ? 'primary-small' : 'filter-button'}
                          onClick={async () => {
                            await updateSupplierStatus(selectedRecord.id, 'Active')
                            notify(`${selectedRecord.name} marked as Active.`)
                            closeDetails()
                          }}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          className={selectedRecord.status === 'Review' ? 'primary-small' : 'filter-button'}
                          onClick={async () => {
                            await updateSupplierStatus(selectedRecord.id, 'Review')
                            notify(`${selectedRecord.name} placed on Review.`)
                            closeDetails()
                          }}
                        >
                          Under Review
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders Modal Details */}
                {modalType === 'orders' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Supplier</span>
                        <b>{selectedRecord.supplier}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Category</span>
                        <b>{selectedRecord.category}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Requester</span>
                        <b>{selectedRecord.requesterName || 'Jordan Lee'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Request Type</span>
                        <b>{selectedRecord.requestType || 'Purchase Requisition'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Order Date</span>
                        <b>{selectedRecord.date}</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Status</span>
                        <span className={`status-pill ${selectedRecord.status.toLowerCase()}`}>
                          {selectedRecord.status}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Quantity</span>
                        <b>{selectedRecord.quantity.toLocaleString()} units</b>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Unit Price</span>
                        <b>${selectedRecord.unitPrice}</b>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Total Commitment</span>
                        <b style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                          ${(selectedRecord.quantity * selectedRecord.unitPrice).toLocaleString()}
                        </b>
                      </div>
                      {selectedRecord.notes && (
                        <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Operational Justification</span>
                          <span>{selectedRecord.notes}</span>
                        </div>
                      )}
                      {selectedRecord.rejectionReason && (
                        <div style={{ gridColumn: 'span 2', background: '#fee2e2', color: '#dc2626', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', display: 'block', fontWeight: 700 }}>Rejection Reason</span>
                          <span>{selectedRecord.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px' }}>
                        Executive Approval Action
                      </label>
                      {selectedRecord.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="primary-small"
                            onClick={async () => {
                              const ok = await approvePurchaseOrder(selectedRecord.id, user?.id || 'usr-manager', user?.name || 'Alex Chen')
                              if (ok) {
                                notify(`Order ${selectedRecord.id} approved.`)
                              } else {
                                notify(`Could not approve order ${selectedRecord.id}.`)
                              }
                              closeDetails()
                            }}
                          >
                            <Check /> Approve Order
                          </button>
                          <button
                            type="button"
                            className="filter-button"
                            style={{ color: '#dc2626' }}
                            onClick={async () => {
                              const ok = await rejectPurchaseOrder(selectedRecord.id, user?.id || 'usr-manager', user?.name || 'Alex Chen', 'Manager rejected during executive inspection.')
                              if (ok) {
                                notify(`Order ${selectedRecord.id} rejected.`)
                              } else {
                                notify(`Could not reject order ${selectedRecord.id}.`)
                              }
                              closeDetails()
                            }}
                          >
                            <X /> Reject Order
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          This request has already been reviewed (Status: <b>{selectedRecord.status}</b>
                          {selectedRecord.reviewedAt ? ` on ${new Date(selectedRecord.reviewedAt).toLocaleDateString()}` : ''}).
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// PROCUREMENT PANEL (Resolved missing procurement page)
// ----------------------------------------------------
function ProcurementPanel({
  orders,
  suppliers,
  notify,
  onApprove,
  onReject,
}: {
  orders: PurchaseOrder[]
  suppliers: Supplier[]
  notify: (msg: string) => void
  onApprove: (id: string) => void | Promise<void>
  onReject: (id: string) => void | Promise<void>
}) {
  const [catFilter, setCatFilter] = useState('All')
  const [poFilter, setPoFilter] = useState('All')

  const totalSpend = procurementSpend(orders)
  const pendingOrders = orders.filter((o) => o.status === 'Pending')
  const approvedOrders = orders.filter((o) => o.status === 'Approved')
  const activeSpend = orders
    .filter((o) => o.status !== 'Draft' && o.status !== 'Rejected')
    .reduce((sum, o) => sum + o.quantity * o.unitPrice, 0)

  const filteredOrders = orders.filter(
    (o) =>
      (catFilter === 'All' || o.category === catFilter) &&
      (poFilter === 'All' || o.status === poFilter)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 4 Procurement KPI Cards */}
      <div className="role-kpis">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>TOTAL PROCUREMENT SPEND</span>
            <Package />
          </div>
          <strong>${(totalSpend / 1000000).toFixed(2)}M</strong>
          <span>Across all purchase orders</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>PENDING APPROVALS</span>
            <Users />
          </div>
          <strong className="text-amber">{pendingOrders.length} orders</strong>
          <span>Requires manager review</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>APPROVED COMMITMENTS</span>
            <Check />
          </div>
          <strong className="text-green">{approvedOrders.length} orders</strong>
          <span>Ready for dispatch</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>ACTIVE SUPPLIERS</span>
            <Truck />
          </div>
          <strong>{suppliers.filter((s) => s.status === 'Active').length} vendors</strong>
          <span>Contracted partners</span>
        </div>
      </div>

      {/* Procurement Category Breakdown */}
      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-head">
            <div>
              <h2>Category Spend Allocations</h2>
              <span>Committed spend by inventory category</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {categories.map((cat) => {
              const catSpend = orders
                .filter((o) => o.category === cat && o.status !== 'Draft')
                .reduce((sum, o) => sum + o.quantity * o.unitPrice, 0)
              const pct = totalSpend > 0 ? Math.round((catSpend / totalSpend) * 100) : 0
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <b>{cat}</b>
                    <span>
                      ${catSpend.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: '#f1f5f9',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: '#2563eb',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div>
              <h2>Top Procurement Suppliers</h2>
              <span>Vendors with largest purchase volume</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {suppliers.slice(0, 5).map((sup, idx) => (
              <div
                key={sup.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: '13px',
                }}
              >
                <div>
                  <b>{sup.name}</b>
                  <small style={{ display: 'block', color: '#64748b' }}>{sup.region}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>${sup.spend.toLocaleString()}</b>
                  <small style={{ display: 'block', color: '#16a34a' }}>{sup.reliability}% on-time</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Procurement Order Review Table */}
      <section className="role-panel">
        <div className="role-panel-head">
          <div>
            <p className="eyebrow blue">PURCHASING ACTION PIPELINE</p>
            <h2>Pending Procurement Approvals</h2>
          </div>
          <span className="badge warning">{pendingOrders.length} pending review</span>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px', textAlign: 'center' }}>
            <Check style={{ color: '#16a34a', width: '24px', height: '24px', margin: '0 auto 6px' }} />
            <b>All procurement requests are up to date</b>
          </div>
        ) : (
          <div className="role-table">
            <div className="role-row role-row-head">
              <span>Order ID</span>
              <span>Supplier</span>
              <span>Category</span>
              <span>Amount</span>
              <span>Approval Action</span>
            </div>
            {pendingOrders.map((o) => (
              <div className="role-row" key={o.id}>
                <div>
                  <b>{o.id}</b>
                  {o.requestType && o.requestType !== 'Purchase Requisition' && (
                    <span style={{ display: 'block', fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>
                      {o.requestType}
                    </span>
                  )}
                </div>
                <div>
                  <span>{o.supplier}</span>
                  <small style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                    Req by: {o.requesterName || 'Jordan Lee'} · {o.quantity} units
                  </small>
                </div>
                <span>{o.category}</span>
                <span>${(o.quantity * o.unitPrice).toLocaleString()}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="primary-small"
                    style={{ padding: '6px 10px', fontSize: '11px' }}
                    onClick={() => onApprove(o.id)}
                  >
                    <Check /> Approve
                  </button>
                  <button
                    type="button"
                    className="filter-button"
                    style={{ padding: '6px 10px', fontSize: '11px', color: '#dc2626' }}
                    onClick={() => onReject(o.id)}
                  >
                    <X /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ----------------------------------------------------
// REPORTS PANEL
// ----------------------------------------------------
function ReportsPanel({ notify }: { notify: (msg: string) => void }) {
  const inv = getInventory()
  const shp = getShipments()
  const pos = getPurchaseOrders()
  const sups = getSuppliers()

  const generateReport = (type: string) => {
    if (type === 'inventory') {
      const rows = inv.map((i) => ({
        SKU: i.sku,
        Name: i.name,
        Category: i.category,
        Warehouse: i.warehouse,
        QuantityOnHand: i.quantity,
        ReorderPoint: i.reorderPoint,
        UnitCost: i.unitCost,
        TotalValue: i.quantity * i.unitCost,
        Status: inventoryStatus(i),
      }))
      exportCsv('inventory-summary-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Inventory Summary Report generated.')
    } else if (type === 'shipment') {
      const rows = shp.map((s) => ({
        ShipmentID: s.id,
        OrderID: s.orderId,
        Origin: s.origin,
        Destination: s.destination,
        Carrier: s.carrier,
        DispatchDate: s.dispatch,
        ExpectedDate: s.expected,
        ActualDate: s.actual || 'In transit',
        Cost: s.cost,
        Status: s.status,
      }))
      exportCsv('shipment-performance-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Shipment Performance Report generated.')
    } else if (type === 'procurement') {
      const rows = pos.map((p) => ({
        OrderID: p.id,
        Supplier: p.supplier,
        Category: p.category,
        Quantity: p.quantity,
        UnitPrice: p.unitPrice,
        TotalCommitment: p.quantity * p.unitPrice,
        Date: p.date,
        Status: p.status,
      }))
      exportCsv('procurement-spend-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Procurement Spend Report generated.')
    } else if (type === 'supplier') {
      const rows = sups.map((s) => ({
        SupplierID: s.id,
        SupplierName: s.name,
        Region: s.region,
        ReliabilityPercent: s.reliability,
        DefectRatePercent: s.defectRate,
        AnnualSpend: s.spend,
        ContactEmail: s.contact,
        Status: s.status,
      }))
      exportCsv('supplier-reliability-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Supplier Reliability Report generated.')
    } else if (type === 'delays') {
      const delayed = shp.filter((s) => isShipmentDelayed(s))
      const rows = delayed.map((s) => ({
        ShipmentID: s.id,
        Route: `${s.origin} -> ${s.destination}`,
        Carrier: s.carrier,
        ExpectedDelivery: s.expected,
        ActualDelivery: s.actual || 'Overdue in transit',
        DelayDays: s.actual
          ? Math.max(1, Math.round((new Date(s.actual).getTime() - new Date(s.expected).getTime()) / 86400000))
          : 'Pending',
        FreightCost: s.cost,
      }))
      exportCsv('delayed-deliveries-report.csv', rows as unknown as Record<string, unknown>[])
      notify('Delayed Deliveries Audit Report generated.')
    }
  }

  const reports = [
    {
      id: 'inventory',
      title: 'Inventory Summary Report',
      description: 'Comprehensive item catalog, stock health classification, and capital valuation.',
    },
    {
      id: 'shipment',
      title: 'Shipment Performance Report',
      description: 'Carrier transit times, delivery timeliness, and freight cost breakdown.',
    },
    {
      id: 'procurement',
      title: 'Procurement Spend Report',
      description: 'Category spending allocations, committed purchase orders, and approval statuses.',
    },
    {
      id: 'supplier',
      title: 'Supplier Reliability Report',
      description: 'Vendor scorecards, defect rates, and fulfilled order performance.',
    },
    {
      id: 'delays',
      title: 'Delayed Deliveries Audit',
      description: 'Exception records for shipments that exceeded expected transit windows.',
    },
  ]

  return (
    <div className="report-grid">
      {reports.map((r, i) => (
        <article className="report-card" key={r.id}>
          <span>0{i + 1}</span>
          <h2>{r.title}</h2>
          <p>{r.description}</p>
          <button type="button" onClick={() => generateReport(r.id)}>
            <Download />
            <span>Generate CSV</span>
          </button>
        </article>
      ))}
    </div>
  )
}

// ----------------------------------------------------
// SETTINGS PANEL
// ----------------------------------------------------
function SettingsPanel({
  notify,
  user,
}: {
  notify: (msg: string) => void
  user: any
}) {
  const [name, setName] = useState(user?.name || 'Alex Chen')
  const [roleTitle, setRoleTitle] = useState('Operations Lead')
  const [compact, setCompact] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [stockoutAlerts, setStockoutAlerts] = useState(true)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    notify('Preferences and profile display successfully saved.')
  }

  return (
    <form onSubmit={handleSave} className="settings-grid">
      <section className="settings-card">
        <h2>Workspace Preferences</h2>
        <label>
          <span>
            <b>Compact table view</b>
            <small>Reduce table row padding for denser information layout.</small>
          </span>
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
          />
        </label>
        <label>
          <span>
            <b>Email status digests</b>
            <small>Receive morning daily summary of exceptions and delayed freight.</small>
          </span>
          <input
            type="checkbox"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
          />
        </label>
        <label>
          <span>
            <b>Low stock notifications</b>
            <small>Trigger alerts when items dip below configured reorder points.</small>
          </span>
          <input
            type="checkbox"
            checked={stockoutAlerts}
            onChange={(e) => setStockoutAlerts(e.target.checked)}
          />
        </label>
      </section>

      <section className="settings-card">
        <h2>Profile Display</h2>
        <label style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>Display Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </label>
        <label style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>Operational Role</span>
          <input
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </label>
        <label style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>Work Email</span>
          <input
            defaultValue={user?.email || 'manager@chainsight.demo'}
            disabled
            style={{ width: '100%', marginTop: '6px', background: '#f8fafc', color: '#64748b' }}
          />
        </label>
        <button type="submit" className="primary-small" style={{ alignSelf: 'flex-start' }}>
          Save Preferences
        </button>
      </section>
    </form>
  )
}
