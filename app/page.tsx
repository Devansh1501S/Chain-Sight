'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, ChevronDown, ChevronRight, CircleCheck, Clock3, Menu, PackageSearch, Radar, ShieldCheck, Truck, Users, X } from 'lucide-react'

const storyViews = [
  { eyebrow: '01 / VISIBILITY', title: 'One view of the entire operation.', body: 'Bring inventory, orders, suppliers, and delivery performance into focus with a live operational command center.', metric: '94.2%', label: 'supply chain health' },
  { eyebrow: '02 / INVENTORY', title: 'Know what to move next.', body: 'Surface stockouts before they happen. Balance working capital against service levels with clarity.', metric: '18.4k', label: 'units in network' },
  { eyebrow: '03 / LOGISTICS', title: 'Make every mile visible.', body: 'See delays forming across lanes and carriers, then act before they become customer-impacting.', metric: '96.8%', label: 'on-time delivery' },
  { eyebrow: '04 / SUPPLIERS', title: 'Hold partners to the signal.', body: 'Understand supplier reliability, purchase order health, and spend patterns in one connected view.', metric: '142', label: 'active suppliers' },
  { eyebrow: '05 / DECISIONS', title: 'Move from signal to decision.', body: 'Give every team the context to prioritize the work that matters most, today and tomorrow.', metric: '24/7', label: 'operational visibility' },
]

const capabilities = [
  { icon: Boxes, title: 'Inventory intelligence', body: 'Stock levels, reorder points, and distribution patterns made legible.' },
  { icon: Truck, title: 'Logistics visibility', body: 'Track shipments, lanes, carriers, and delays from one place.' },
  { icon: BarChart3, title: 'Procurement analytics', body: 'Connect purchase orders and spend to operational outcomes.' },
  { icon: Users, title: 'Supplier performance', body: 'A clear view of reliability, lead times, and accountability.' },
  { icon: Clock3, title: 'Delivery monitoring', body: 'Spot exceptions early and keep customer promises in view.' },
  { icon: Radar, title: 'Operational reporting', body: 'Turn complex data into focused, shareable decisions.' },
]

function Logo() { return <Link href="/" className="brand" aria-label="ChainSight home"><span className="brand-mark"><span /></span><span>chainsight</span></Link> }

function MiniChart({ type = 'line' }: { type?: 'line' | 'bars' }) {
  if (type === 'bars') return <div className="mini-bars" aria-label="Bar chart"><i style={{ height: '43%' }} /><i style={{ height: '68%' }} /><i style={{ height: '55%' }} /><i style={{ height: '84%' }} /><i style={{ height: '73%' }} /><i style={{ height: '96%' }} /></div>
  return <svg viewBox="0 0 360 110" preserveAspectRatio="none" className="mini-line" aria-label="Trend chart"><path d="M0 84 C35 78 43 65 67 72 S105 48 130 62 S168 26 194 45 S232 37 252 50 S295 18 322 30 S345 17 360 22" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M0 84 C35 78 43 65 67 72 S105 48 130 62 S168 26 194 45 S232 37 252 50 S295 18 322 30 S345 17 360 22 V110 H0Z" fill="currentColor" opacity=".08" /></svg>
}

function Dashboard({ view = 0 }: { view?: number }) {
  const data = storyViews[view]
  return <div className="dashboard" key={view}>
    <div className="dash-top"><div className="dash-title"><span className="live-dot" /> Overview <small>Last 30 days <ChevronDown /></small></div><div className="dash-actions"><span /> <span /> <b>AC</b></div></div>
    <div className="dash-body"><aside className="dash-side"><div className="side-logo">CS</div>{[BarChart3, Boxes, Truck, Users, ShieldCheck].map((Icon, i) => <Icon key={i} className={i === Math.min(view, 4) ? 'active' : ''} />)}<div className="side-bottom"><SettingsIcon /></div></aside>
      <div className="dash-main"><div className="dash-heading"><div><p>Good morning, Alex</p><h4>{data.title}</h4></div><button>Export report <ArrowRight /></button></div>
        <div className="kpi-grid"><div className="kpi"><small>SUPPLY CHAIN HEALTH</small><strong>{data.metric}</strong><em>+4.8% <span>vs. prior period</span></em></div><div className="kpi"><small>IN TRANSIT</small><strong>{view === 2 ? '2,842' : '8,429'}</strong><em>+12.6% <span>vs. prior period</span></em></div><div className="kpi"><small>EXCEPTIONS</small><strong>{view === 1 ? '18' : '07'}</strong><em className="warning">Needs attention</em></div></div>
        <div className="dash-grid"><div className="dash-card wide"><div className="card-head"><span>Network performance</span><small>Weekly <ChevronDown /></small></div><div className="chart-label"><strong>{view === 1 ? 'Inventory flow' : view === 2 ? 'Delivery performance' : view === 3 ? 'Supplier reliability' : 'Network health'}</strong><span>Target <b>92%</b></span></div><MiniChart /></div><div className="dash-card"><div className="card-head"><span>{view === 1 ? 'Inventory mix' : view === 3 ? 'Top suppliers' : 'Active lanes'}</span><MoreIcon /></div><div className="rank-list">{['Northstar Components', 'Harbor Freight Co.', 'Atlas Manufacturing'].map((x, i) => <div key={x}><span className={`rank-dot r${i}`} />{x}<b>{[98, 94, 89][i]}%</b></div>)}</div></div></div>
      </div></div>
  </div>
}
function SettingsIcon() { return <div className="settings-icon">•••</div> }
function MoreIcon() { return <span className="more">•••</span> }

function Nav() { const [open, setOpen] = useState(false); useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, []); return <header className="nav"><Logo /><nav className={open ? 'open' : ''}><a href="#platform" onClick={() => setOpen(false)}>Platform</a><a href="#capabilities" onClick={() => setOpen(false)}>Capabilities</a><a href="#outcomes" onClick={() => setOpen(false)}>Outcomes</a><Link href="/login" onClick={() => setOpen(false)}>Sign in</Link></nav><div className="nav-cta"><Link href="/login" className="text-link">Sign in</Link><Link href="/login" className="nav-button">Open dashboard <ArrowRight /></Link></div><button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X /> : <Menu />}</button></header> }

export default function Page() {
  const [activeView, setActiveView] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  return <main className="site-shell"><Nav /><section className="hero" id="platform"><div className="hero-grid" /><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> CHAINSIGHT / SUPPLY CHAIN INTELLIGENCE</p><h1>See your<br /><i>supply chain.</i><br />Clearly.</h1><p className="hero-sub">Turn inventory, procurement, and logistics data into decisions that move your business forward.</p><div className="hero-actions"><a className="primary-button" href="#story">Explore the platform <ArrowRight /></a><Link className="secondary-button" href="/login">Open dashboard <ArrowRight /></Link></div></div><div className="hero-device"><Dashboard /><div className="device-base" /></div><div className="scroll-cue"><span>Scroll to explore</span><div /></div></section>
    <section className="story" id="story"><div className="story-intro"><p className="eyebrow blue">THE OPERATING PICTURE</p><h2>Complexity, made<br /><i>decisive.</i></h2><p>ChainSight gives every team the same clear picture — so better decisions happen at the speed of your business.</p></div><div className="story-layout"><div className="story-steps">{storyViews.map((item, i) => <article className={`story-step ${activeView === i ? 'selected' : ''}`} key={item.eyebrow} onMouseEnter={() => setActiveView(i)}><span>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.body}</p><button onClick={() => setActiveView(i)} aria-label={`Show ${item.title}`}>View signal <ChevronRight /></button></article>)}</div><div className="story-screen"><Dashboard view={activeView} /></div></div></section>
    <section className="capabilities" id="capabilities"><div className="section-heading"><p className="eyebrow blue">BUILT FOR THE WHOLE CHAIN</p><h2>Everything connected.<br /><i>Nothing obscured.</i></h2></div><div className="cap-grid">{capabilities.map(({ icon: Icon, title, body }) => <div className="cap-card" key={title}><Icon /><h3>{title}</h3><p>{body}</p><ArrowRight /></div>)}</div></section>
    <section className="preview"><div className="preview-copy"><p className="eyebrow blue">A CLEARER OPERATING RHYTHM</p><h2>The right detail.<br /><i>At the right time.</i></h2><p>Move between the views your team needs without losing the context that connects them.</p><div className="preview-tabs" role="tablist">{['Overview', 'Inventory', 'Logistics', 'Suppliers'].map((tab, i) => <button key={tab} className={activeView === i ? 'active' : ''} onClick={() => setActiveView(i)} role="tab" aria-selected={activeView === i}>{tab}</button>)}</div></div><div className="preview-screen"><Dashboard view={activeView} /></div></section>
    <section className="outcomes" id="outcomes"><div className="outcome-heading"><p className="eyebrow blue">DESIGNED FOR BETTER DECISIONS</p><h2>Make the signal<br /><i>impossible to miss.</i></h2></div><div className="outcome-list">{['Better inventory visibility.', 'Faster identification of delivery delays.', 'Improved supplier accountability.', 'More informed procurement decisions.'].map((x, i) => <div className="outcome" key={x}><span>0{i + 1}</span><CircleCheck /><h3>{x}</h3><button onClick={() => setExpanded(expanded === i ? null : i)} aria-expanded={expanded === i}><ChevronDown /></button>{expanded === i && <p>Give your teams a shared, timely view of what needs attention — and the context to act on it.</p>}</div>)}</div></section>
    <section className="final-cta"><p className="eyebrow">CHAINSIGHT / CLEARER BY DESIGN</p><h2>Make every supply chain<br /><i>decision count.</i></h2><div className="hero-actions"><Link className="primary-button" href="/login">Open dashboard <ArrowRight /></Link><Link className="secondary-button" href="/login">Sign in</Link></div></section>
    <footer><Logo /><div className="footer-links"><div><span>Platform</span><a href="#capabilities">Capabilities</a><a href="#story">Product tour</a></div><div><span>Analytics</span><a href="#outcomes">Outcomes</a><a href="#platform">Overview</a></div><div><span>Company</span><Link href="/login">Sign in</Link><a href="#platform">Contact</a></div></div><div className="footer-bottom"><span>© 2026 ChainSight, Inc.</span><span><a href="#platform">Privacy</a><a href="#platform">Terms</a></span></div></footer>
  </main>
}
