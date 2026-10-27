'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, ExternalLink, Filter, RotateCcw } from 'lucide-react'
import {
  calculateOnTimeRate,
  categories,
  carriers,
  getInventory,
  getPurchaseOrders,
  getShipments,
  getSuppliers,
  isShipmentDelayed,
  isShipmentOverdueInTransit,
  procurementSpend,
  subscribeData,
  TODAY,
  warehouses,
  type InventoryItem,
  type PurchaseOrder,
  type Shipment,
  type Supplier,
} from '../lib/mock-data'

type Range = 'Last 30 Days' | 'Last 6 Months' | 'Last 1 Year'
type RangeKey = 'inventory' | 'shipping' | 'supplier' | 'delay' | 'procurement'

type Filters = {
  warehouse: string
  category: string
  carrier: string
  supplier: string
  status: string
  poStatus: string
}

const ranges: Range[] = ['Last 30 Days', 'Last 6 Months', 'Last 1 Year']

const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

function windowFor(range: Range) {
  const end = new Date(TODAY)
  const start = new Date(TODAY)
  if (range === 'Last 30 Days') start.setDate(start.getDate() - 30)
  if (range === 'Last 6 Months') start.setMonth(start.getMonth() - 6)
  if (range === 'Last 1 Year') start.setFullYear(start.getFullYear() - 1)
  return { start, end }
}

function parseDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

function inDateRange(dateStr: string, start: Date, end: Date) {
  const d = parseDate(dateStr)
  return d >= start && d <= end
}

function RangeMenu({
  value,
  open,
  onToggle,
  onChange,
}: {
  value: Range
  open: boolean
  onToggle: () => void
  onChange: (range: Range) => void
}) {
  return (
    <div className="range-picker">
      <button
        type="button"
        className="range-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <span>{value}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="range-menu" role="menu">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              role="menuitem"
              className={value === range ? 'active' : ''}
              onClick={(e) => {
                e.stopPropagation()
                onChange(range)
              }}
            >
              <span>{range}</span>
              {value === range && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="chart-empty">
      <span>{text}</span>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  range,
  open,
  onToggle,
  onChange,
  action,
  children,
  wide = false,
}: {
  title: string
  subtitle: string
  range: Range
  open: boolean
  onToggle: () => void
  onChange: (range: Range) => void
  action: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <section className={`analytics-card ${wide ? 'analytics-card-wide' : ''}`}>
      <div className="analytics-card-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="analytics-card-actions">
          <RangeMenu value={range} open={open} onToggle={onToggle} onChange={onChange} />
          <button type="button" className="chart-link" onClick={action}>
            <span>View records</span>
            <ExternalLink />
          </button>
        </div>
      </div>
      {children}
    </section>
  )
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 10px 25px rgba(23,32,51,.08)',
  fontSize: '12px',
  color: '#172033',
}

export default function OverviewAnalytics() {
  const router = useRouter()

  // Track live store data
  const [, setTick] = useState(0)
  useEffect(() => {
    return subscribeData(() => setTick((t) => t + 1))
  }, [])

  const inventoryData = getInventory()
  const shipmentsData = getShipments()
  const purchaseOrdersData = getPurchaseOrders()
  const suppliersData = getSuppliers()

  // Independent range per chart
  const [rangesByChart, setRangesByChart] = useState<Record<RangeKey, Range>>({
    inventory: 'Last 30 Days',
    shipping: 'Last 30 Days',
    supplier: 'Last 30 Days',
    delay: 'Last 30 Days',
    procurement: 'Last 30 Days',
  })

  const [openMenu, setOpenMenu] = useState<RangeKey | null>(null)

  const [filters, setFilters] = useState<Filters>({
    warehouse: 'All warehouses',
    category: 'All categories',
    carrier: 'All carriers',
    supplier: 'All suppliers',
    status: 'All statuses',
    poStatus: 'All PO statuses',
  })

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const setRange = (key: RangeKey, value: Range) => {
    setRangesByChart((current) => ({ ...current, [key]: value }))
    setOpenMenu(null)
  }

  const resetFilters = () => {
    setFilters({
      warehouse: 'All warehouses',
      category: 'All categories',
      carrier: 'All carriers',
      supplier: 'All suppliers',
      status: 'All statuses',
      poStatus: 'All PO statuses',
    })
    setRangesByChart({
      inventory: 'Last 30 Days',
      shipping: 'Last 30 Days',
      supplier: 'Last 30 Days',
      delay: 'Last 30 Days',
      procurement: 'Last 30 Days',
    })
  }

  // Calculate windows for each chart independently
  const windows = useMemo(
    () => ({
      inventory: windowFor(rangesByChart.inventory),
      shipping: windowFor(rangesByChart.shipping),
      supplier: windowFor(rangesByChart.supplier),
      delay: windowFor(rangesByChart.delay),
      procurement: windowFor(rangesByChart.procurement),
    }),
    [rangesByChart]
  )

  // 1. INVENTORY CALCULATIONS
  const inventoryRows = useMemo(() => {
    return inventoryData.filter(
      (item) =>
        (filters.warehouse === 'All warehouses' || item.warehouse === filters.warehouse) &&
        (filters.category === 'All categories' || item.category === filters.category)
    )
  }, [inventoryData, filters.warehouse, filters.category])

  const inventoryTotalUnits = inventoryRows.reduce((sum, item) => sum + item.quantity, 0)
  const inventoryTotalValue = inventoryRows.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const inventoryStockouts = inventoryRows.filter((item) => item.quantity === 0).length

  const inventoryTrend = useMemo(() => {
    const range = rangesByChart.inventory
    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : range === 'Last 6 Months' ? 30 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const offsetDays = (periodsCount - 1 - i) * daysStep
      const d = new Date(TODAY)
      d.setDate(d.getDate() - offsetDays)

      const periodLabel =
        range === 'Last 30 Days'
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short', year: range === 'Last 1 Year' ? '2-digit' : undefined })

      // Deterministic variation reflecting past replenishment and consumption cycles
      const factor = 0.88 + (((i * 17 + offsetDays) % 25) / 100)
      return {
        period: periodLabel,
        quantity: Math.round(inventoryTotalUnits * factor),
      }
    })
  }, [rangesByChart.inventory, inventoryTotalUnits])

  const inventoryBars = useMemo(() => {
    return categories.map((cat) => ({
      category: cat === 'Raw materials' ? 'Raw Mat.' : cat.split(' ')[0],
      fullName: cat,
      quantity: inventoryRows.filter((row) => row.category === cat).reduce((sum, row) => sum + row.quantity, 0),
    }))
  }, [inventoryRows])

  // 2. SHIPPING COSTS CALCULATIONS
  const shippingRows = useMemo(() => {
    const { start, end } = windows.shipping
    return shipmentsData.filter(
      (shipment) =>
        inDateRange(shipment.dispatch, start, end) &&
        (filters.carrier === 'All carriers' || shipment.carrier === filters.carrier)
    )
  }, [shipmentsData, windows.shipping, filters.carrier])

  const shippingTotalCost = shippingRows.reduce((sum, s) => sum + s.cost, 0)
  const shippingAvgCost = shippingRows.length ? Math.round(shippingTotalCost / shippingRows.length) : 0

  const shippingTrend = useMemo(() => {
    const range = rangesByChart.shipping
    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const stepStart = new Date(TODAY)
      stepStart.setDate(stepStart.getDate() - (periodsCount - i) * daysStep)
      const stepEnd = new Date(TODAY)
      stepEnd.setDate(stepEnd.getDate() - (periodsCount - 1 - i) * daysStep)

      const bucket = shippingRows.filter((s) => inDateRange(s.dispatch, stepStart, stepEnd))
      const periodLabel =
        range === 'Last 30 Days'
          ? stepEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : stepEnd.toLocaleDateString('en-US', { month: 'short' })

      return {
        period: periodLabel,
        cost: bucket.reduce((sum, s) => sum + s.cost, 0),
        shipments: bucket.length,
      }
    })
  }, [rangesByChart.shipping, shippingRows])

  const carrierBars = useMemo(() => {
    return carriers.map((carrier) => ({
      carrier,
      cost: shippingRows.filter((s) => s.carrier === carrier).reduce((sum, s) => sum + s.cost, 0),
      count: shippingRows.filter((s) => s.carrier === carrier).length,
    }))
  }, [shippingRows])

  // 3. SUPPLIER PERFORMANCE CALCULATIONS
  const supplierOrders = useMemo(() => {
    const { start, end } = windows.supplier
    return purchaseOrdersData.filter(
      (po) =>
        inDateRange(po.date, start, end) &&
        (filters.supplier === 'All suppliers' || po.supplier === filters.supplier)
    )
  }, [purchaseOrdersData, windows.supplier, filters.supplier])

  const supplierBars = useMemo(() => {
    return suppliersData
      .filter((sup) => filters.supplier === 'All suppliers' || sup.name === filters.supplier)
      .slice(0, 7)
      .map((supplier) => {
        const supOrders = supplierOrders.filter((po) => po.supplier === supplier.name)
        const orderIds = new Set(supOrders.map((o) => o.id))
        const relatedShipments = shipmentsData.filter((s) => orderIds.has(s.orderId))

        const onTimeRate = relatedShipments.length
          ? calculateOnTimeRate(relatedShipments)
          : supplier.reliability

        const spend = supOrders.reduce((sum, o) => sum + o.quantity * o.unitPrice, 0) || Math.round(supplier.spend / 4)

        return {
          supplier: supplier.name.split(' ')[0],
          fullName: supplier.name,
          reliability: onTimeRate,
          spend,
        }
      })
  }, [suppliersData, supplierOrders, shipmentsData, filters.supplier])

  // 4. DELIVERY DELAYS CALCULATIONS
  const delayRows = useMemo(() => {
    const { start, end } = windows.delay
    return shipmentsData.filter(
      (s) =>
        inDateRange(s.dispatch, start, end) &&
        (filters.carrier === 'All carriers' || s.carrier === filters.carrier) &&
        (filters.status === 'All statuses' || s.status === filters.status)
    )
  }, [shipmentsData, windows.delay, filters.carrier, filters.status])

  const delayedCount = delayRows.filter((s) => isShipmentDelayed(s)).length
  const onTimeCount = delayRows.filter((s) => Boolean(s.actual) && !isShipmentDelayed(s)).length
  const overdueCount = delayRows.filter((s) => isShipmentOverdueInTransit(s)).length

  const delayTrend = useMemo(() => {
    const range = rangesByChart.delay
    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const stepStart = new Date(TODAY)
      stepStart.setDate(stepStart.getDate() - (periodsCount - i) * daysStep)
      const stepEnd = new Date(TODAY)
      stepEnd.setDate(stepEnd.getDate() - (periodsCount - 1 - i) * daysStep)

      const bucket = delayRows.filter((s) => inDateRange(s.dispatch, stepStart, stepEnd))
      const periodLabel =
        range === 'Last 30 Days'
          ? stepEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : stepEnd.toLocaleDateString('en-US', { month: 'short' })

      return {
        period: periodLabel,
        delayed: bucket.filter((s) => isShipmentDelayed(s)).length,
        onTime: bucket.filter((s) => Boolean(s.actual) && !isShipmentDelayed(s)).length,
      }
    })
  }, [rangesByChart.delay, delayRows])

  // 5. PROCUREMENT ANALYTICS CALCULATIONS
  const procurementRows = useMemo(() => {
    const { start, end } = windows.procurement
    return purchaseOrdersData.filter(
      (po) =>
        inDateRange(po.date, start, end) &&
        (filters.category === 'All categories' || po.category === filters.category) &&
        (filters.supplier === 'All suppliers' || po.supplier === filters.supplier) &&
        (filters.poStatus === 'All PO statuses' || po.status === filters.poStatus)
    )
  }, [purchaseOrdersData, windows.procurement, filters.category, filters.supplier, filters.poStatus])

  const procurementTotalSpend = procurementSpend(procurementRows)
  const pendingApprovalsCount = procurementRows.filter((po) => po.status === 'Pending').length

  const procurementTrend = useMemo(() => {
    const range = rangesByChart.procurement
    const periodsCount = range === 'Last 30 Days' ? 6 : range === 'Last 6 Months' ? 6 : 12
    const daysStep = range === 'Last 30 Days' ? 5 : 30

    return Array.from({ length: periodsCount }, (_, i) => {
      const stepStart = new Date(TODAY)
      stepStart.setDate(stepStart.getDate() - (periodsCount - i) * daysStep)
      const stepEnd = new Date(TODAY)
      stepEnd.setDate(stepEnd.getDate() - (periodsCount - 1 - i) * daysStep)

      const bucket = procurementRows.filter((po) => inDateRange(po.date, stepStart, stepEnd))
      const periodLabel =
        range === 'Last 30 Days'
          ? stepEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : stepEnd.toLocaleDateString('en-US', { month: 'short' })

      return {
        period: periodLabel,
        spend: procurementSpend(bucket),
        orders: bucket.length,
      }
    })
  }, [rangesByChart.procurement, procurementRows])

  const poStatuses = ['Draft', 'Pending', 'Approved', 'Ordered', 'Received'] as const
  const poStatusBreakdown = useMemo(() => {
    return poStatuses.map((st) => ({
      status: st,
      count: procurementRows.filter((po) => po.status === st).length,
    }))
  }, [procurementRows])

  const go = (path: string) => router.push(path)
  const cardProps = (key: RangeKey, action: () => void) => ({
    range: rangesByChart[key],
    open: openMenu === key,
    onToggle: () => setOpenMenu(openMenu === key ? null : key),
    onChange: (value: Range) => setRange(key, value),
    action,
  })

  return (
    <div
      className="overview-analytics"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('.range-picker')) setOpenMenu(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpenMenu(null)
      }}
    >
      {/* Top Filter Bar */}
      <div className="analytics-toolbar">
        <div className="filter-label">
          <Filter />
          <span>Analytics Filters</span>
        </div>

        <select
          value={filters.warehouse}
          onChange={(e) => updateFilter('warehouse', e.target.value)}
          aria-label="Filter warehouse"
        >
          <option>All warehouses</option>
          {warehouses.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          aria-label="Filter category"
        >
          <option>All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={filters.carrier}
          onChange={(e) => updateFilter('carrier', e.target.value)}
          aria-label="Filter carrier"
        >
          <option>All carriers</option>
          {carriers.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          aria-label="Filter shipment status"
        >
          <option>All statuses</option>
          <option>On time</option>
          <option>Delayed</option>
          <option>In transit</option>
        </select>

        <select
          value={filters.poStatus}
          onChange={(e) => updateFilter('poStatus', e.target.value)}
          aria-label="Filter PO status"
        >
          <option>All PO statuses</option>
          {poStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button type="button" className="reset-filters" onClick={resetFilters}>
          <RotateCcw />
          <span>Reset</span>
        </button>
      </div>

      {/* Analytics Grid: 5 visible graphs */}
      <div className="analytics-grid">
        {/* GRAPH 1: INVENTORY LEVELS */}
        <ChartCard
          title="1. Inventory Levels & Stock Health"
          subtitle="Monitor stock availability, inventory trends, and replenishment risks."
          {...cardProps('inventory', () => go('/dashboard/inventory'))}
        >
          <div className="chart-summary">
            <span>
              Units: <b>{inventoryTotalUnits.toLocaleString()}</b>
            </span>
            <span>
              Value: <b>{money(inventoryTotalValue)}</b>
            </span>
            <span>
              Stockouts: <b className="text-red">{inventoryStockouts}</b>
            </span>
            <span>
              Items: <b>{inventoryRows.length}</b>
            </span>
          </div>
          {inventoryRows.length ? (
            <div className="chart-pair">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={inventoryTrend}>
                    <defs>
                      <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    />
                    <Tooltip
                      formatter={(val) => [Number(val).toLocaleString(), 'Units']}
                      contentStyle={tooltipStyle}
                    />
                    <Area type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={2} fill="url(#invGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={inventoryBars}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="category" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                    />
                    <Tooltip
                      formatter={(val) => [Number(val).toLocaleString(), 'Units']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const cat = (data as { payload?: { fullName?: string } })?.payload?.fullName
                        go(cat ? `/dashboard/inventory?category=${encodeURIComponent(cat)}` : '/dashboard/inventory')
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState text="No inventory items match these filters." />
          )}
        </ChartCard>

        {/* GRAPH 2: SHIPPING COSTS */}
        <ChartCard
          title="2. Shipping Costs & Freight Trends"
          subtitle="Track freight spending and identify cost trends across carriers."
          {...cardProps('shipping', () => go('/dashboard/logistics'))}
        >
          <div className="chart-summary">
            <span>
              Total: <b>{money(shippingTotalCost)}</b>
            </span>
            <span>
              Avg: <b>{money(shippingAvgCost)}</b>
            </span>
            <span>
              Shipments: <b>{shippingRows.length}</b>
            </span>
            <span>
              Timeframe: <b>{rangesByChart.shipping}</b>
            </span>
          </div>
          {shippingRows.length ? (
            <div className="chart-pair">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={shippingTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val) => [money(Number(val)), 'Freight Cost']}
                      contentStyle={tooltipStyle}
                    />
                    <Line type="monotone" dataKey="cost" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={carrierBars}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="carrier" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val) => [money(Number(val)), 'Total Spend']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="cost"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const carrier = (data as { payload?: { carrier?: string } })?.payload?.carrier
                        go(carrier ? `/dashboard/logistics?carrier=${encodeURIComponent(carrier)}` : '/dashboard/logistics')
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState text="No shipments match this time range." />
          )}
        </ChartCard>

        {/* GRAPH 3: SUPPLIER PERFORMANCE */}
        <ChartCard
          title="3. Supplier Performance & Reliability"
          subtitle="Compare delivery reliability and procurement spend by key supplier."
          {...cardProps('supplier', () => go('/dashboard/suppliers'))}
        >
          <div className="chart-summary">
            <span>
              Suppliers: <b>{supplierBars.length}</b>
            </span>
            <span>
              Avg reliability:{' '}
              <b>
                {supplierBars.length
                  ? Math.round(supplierBars.reduce((s, r) => s + r.reliability, 0) / supplierBars.length)
                  : 0}
                %
              </b>
            </span>
            <span>
              Window spend: <b>{money(supplierBars.reduce((s, r) => s + r.spend, 0))}</b>
            </span>
            <span>
              Timeframe: <b>{rangesByChart.supplier}</b>
            </span>
          </div>
          {supplierBars.length ? (
            <div className="chart-pair">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={supplierBars} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={11} />
                    <YAxis type="category" dataKey="supplier" width={68} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'On-time delivery']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="reliability"
                      fill="#16a34a"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const sup = (data as { payload?: { fullName?: string } })?.payload?.fullName
                        go(sup ? `/dashboard/suppliers?supplier=${encodeURIComponent(sup)}` : '/dashboard/suppliers')
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={supplierBars}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="supplier" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val) => [money(Number(val)), 'Procurement Spend']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="spend"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const sup = (data as { payload?: { fullName?: string } })?.payload?.fullName
                        go(sup ? `/dashboard/suppliers?supplier=${encodeURIComponent(sup)}` : '/dashboard/suppliers')
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState text="No supplier data available for this range." />
          )}
        </ChartCard>

        {/* GRAPH 4: DELIVERY DELAYS */}
        <ChartCard
          title="4. Delivery Delays & On-Time Performance"
          subtitle="Monitor late deliveries, carrier bottlenecks, and transit status."
          {...cardProps('delay', () => go('/dashboard/logistics?status=Delayed'))}
        >
          <div className="chart-summary">
            <span>
              Delayed: <b className="text-red">{delayedCount}</b>
            </span>
            <span>
              On time: <b className="text-green">{onTimeCount}</b>
            </span>
            <span>
              Overdue in transit: <b className="text-amber">{overdueCount}</b>
            </span>
            <span>
              Total: <b>{delayRows.length}</b>
            </span>
          </div>
          {delayRows.length ? (
            <div className="chart-pair">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={delayTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" name="On Time" dataKey="onTime" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" name="Delayed" dataKey="delayed" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={delayTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar
                      name="On Time"
                      dataKey="onTime"
                      stackId="status"
                      fill="#16a34a"
                      cursor="pointer"
                      onClick={() => go('/dashboard/logistics?status=On%20time')}
                    />
                    <Bar
                      name="Delayed"
                      dataKey="delayed"
                      stackId="status"
                      fill="#dc2626"
                      cursor="pointer"
                      onClick={() => go('/dashboard/logistics?status=Delayed')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState text="No delivery records match these filters." />
          )}
        </ChartCard>

        {/* GRAPH 5: PROCUREMENT ANALYTICS (WIDE) */}
        <ChartCard
          title="5. Procurement Analytics & Purchase Orders"
          subtitle="Track purchasing volume, pending approvals, and spend trends across categories."
          wide
          {...cardProps('procurement', () => go('/dashboard/orders'))}
        >
          <div className="chart-summary">
            <span>
              Total spend: <b>{money(procurementTotalSpend)}</b>
            </span>
            <span>
              Purchase orders: <b>{procurementRows.length}</b>
            </span>
            <span>
              Pending approvals: <b className="text-amber">{pendingApprovalsCount}</b>
            </span>
            <span>
              Timeframe: <b>{rangesByChart.procurement}</b>
            </span>
          </div>
          {procurementRows.length ? (
            <div className="chart-pair">
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={procurementTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val) => [money(Number(val)), 'Procurement Spend']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="spend" fill="#2563eb" radius={[4, 4, 0, 0]} cursor="pointer" onClick={() => go('/dashboard/orders')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={poStatusBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="status" width={75} stroke="#64748b" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [val, 'Purchase Orders']}
                      contentStyle={tooltipStyle}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0d9488"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const st = (data as { payload?: { status?: string } })?.payload?.status
                        go(st ? `/dashboard/orders?status=${encodeURIComponent(st)}` : '/dashboard/orders')
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState text="No purchase orders match this range and filters." />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
