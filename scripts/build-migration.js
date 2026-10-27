const fs = require('fs');
const ts = require('typescript');

const tsCode = fs.readFileSync('lib/mock-data.ts', 'utf8');
const jsCode = ts.transpile(tsCode, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
const m = { exports: {} };
new Function('module', 'exports', 'require', jsCode)(m, m.exports, require);
const {
  initialInventory,
  initialSuppliers,
  initialShipments,
  initialPurchaseOrders,
  initialEmployeeTasks,
  initialNotifications,
} = m.exports;

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return `'` + String(val).replace(/'/g, `''`) + `'`;
}

let sql = `-- ====================================================================
-- CHAINSIGHT DATABASE SCHEMA & INITIAL DATA MIGRATION
-- Project: ChainSight Supply Chain Analytics Platform
-- Generated: 2026-10-27
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE (User profiles & assignments)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MANAGER', 'EMPLOYEE')),
  assignments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WAREHOUSES TABLE
CREATE TABLE IF NOT EXISTS public.warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  warehouse TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 50 CHECK (reorder_point >= 0),
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Review', 'Archived')) DEFAULT 'Active',
  reliability NUMERIC(5, 2) NOT NULL DEFAULT 85 CHECK (reliability >= 0 AND reliability <= 100),
  defect_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.0 CHECK (defect_rate >= 0),
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  carrier TEXT NOT NULL CHECK (carrier IN ('DHL', 'FedEx', 'Maersk', 'UPS')),
  dispatch DATE NOT NULL,
  expected DATE NOT NULL,
  actual DATE,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  status TEXT NOT NULL CHECK (status IN ('On time', 'Delayed', 'In transit')) DEFAULT 'In transit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PURCHASE ORDERS TABLE (Shared Employee Requisition <-> Manager Approvals)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  supplier TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'Pending', 'Approved', 'Ordered', 'Received')) DEFAULT 'Draft',
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  requester_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name TEXT,
  reviewer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMPLOYEE TASKS TABLE
CREATE TABLE IF NOT EXISTS public.employee_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
  due DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
  related TEXT,
  assignee_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT,
  time_ago TEXT,
  category TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. REALTIME CONFIGURATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated clients full access for prototype demo workflows
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shipments" ON public.shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on employee_tasks" ON public.employee_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 12. SEED INITIAL PROFILES
INSERT INTO public.profiles (id, name, email, role, assignments) VALUES
('usr-manager', 'Alex Chen', 'manager@chainsight.demo', 'MANAGER', '{}'),
('usr-employee', 'Jordan Lee', 'employee@chainsight.demo', 'EMPLOYEE', '{"SHP-26001", "SHP-26004", "SHP-26008", "SHP-26012", "SHP-26015", "PO-07001", "PO-07004", "PO-07008"}')
ON CONFLICT (id) DO UPDATE SET assignments = EXCLUDED.assignments;

-- 13. SEED WAREHOUSES
INSERT INTO public.warehouses (id, name, location) VALUES
('wh-east', 'East hub', 'Newark, NJ'),
('wh-west', 'West hub', 'Reno, NV'),
('wh-central', 'Central hub', 'Dallas, TX'),
('wh-portside', 'Portside', 'Long Beach, CA')
ON CONFLICT (id) DO NOTHING;
\n`;

// Seed Suppliers
sql += '-- 14. SEED SUPPLIERS\nINSERT INTO public.suppliers (id, name, region, status, reliability, defect_rate, spend, contact) VALUES\n';
sql += initialSuppliers.map(s => `(${esc(s.id)}, ${esc(s.name)}, ${esc(s.region)}, ${esc(s.status)}, ${s.reliability}, ${s.defectRate}, ${s.spend}, ${esc(s.contact)})`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// Seed Inventory
sql += '-- 15. SEED INVENTORY ITEMS\nINSERT INTO public.inventory_items (id, sku, name, category, warehouse, quantity, reorder_point, unit_cost, updated) VALUES\n';
sql += initialInventory.map(i => `(${esc(i.id)}, ${esc(i.sku)}, ${esc(i.name)}, ${esc(i.category)}, ${esc(i.warehouse)}, ${i.quantity}, ${i.reorderPoint}, ${i.unitCost}, ${esc(i.updated)})`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// Seed Shipments
sql += '-- 16. SEED SHIPMENTS\nINSERT INTO public.shipments (id, order_id, origin, destination, carrier, dispatch, expected, actual, cost, status) VALUES\n';
sql += initialShipments.map(s => `(${esc(s.id)}, ${esc(s.orderId)}, ${esc(s.origin)}, ${esc(s.destination)}, ${esc(s.carrier)}, ${esc(s.dispatch)}, ${esc(s.expected)}, ${esc(s.actual)}, ${s.cost}, ${esc(s.status)})`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// Seed Purchase Orders
sql += '-- 17. SEED PURCHASE ORDERS\nINSERT INTO public.purchase_orders (id, supplier, category, status, quantity, unit_price, date, requester_name) VALUES\n';
sql += initialPurchaseOrders.map(p => `(${esc(p.id)}, ${esc(p.supplier)}, ${esc(p.category)}, ${esc(p.status)}, ${p.quantity}, ${p.unitPrice}, ${esc(p.date)}, 'Jordan Lee')`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// Seed Employee Tasks
sql += '-- 18. SEED EMPLOYEE TASKS\nINSERT INTO public.employee_tasks (id, title, description, priority, due, status, related, assignee_id) VALUES\n';
sql += initialEmployeeTasks.map(t => `(${esc(t.id)}, ${esc(t.title)}, ${esc(t.description)}, ${esc(t.priority)}, ${esc(t.due)}, ${esc(t.status)}, ${esc(t.related)}, 'usr-employee')`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// Seed Notifications
sql += '-- 19. SEED NOTIFICATIONS\nINSERT INTO public.notifications (id, title, detail, time_ago, category, read, user_id) VALUES\n';
sql += initialNotifications.map(n => `(${esc(n.id)}, ${esc(n.title)}, ${esc(n.detail)}, ${esc(n.timeAgo)}, ${esc(n.category)}, ${n.read ? 'TRUE' : 'FALSE'}, 'usr-employee')`).join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n';

fs.mkdirSync('supabase/migrations', { recursive: true });
fs.writeFileSync('supabase/migrations/20261027_init_chainsight_schema.sql', sql);
console.log('Generated supabase/migrations/20261027_init_chainsight_schema.sql successfully! Total size:', sql.length, 'bytes');
