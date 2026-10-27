export type Role = 'MANAGER' | 'EMPLOYEE'

export type Permission =
  | 'inventory.read'
  | 'inventory.create'
  | 'inventory.update'
  | 'inventory.delete'
  | 'shipments.read'
  | 'shipments.update'
  | 'procurement.read'
  | 'procurement.create'
  | 'procurement.update'
  | 'procurement.approve'
  | 'suppliers.read'
  | 'suppliers.manage'
  | 'reports.read'
  | 'reports.export'
  | 'users.manage'
  | 'settings.manage'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  assignments: string[]
}

export type Session = {
  user: User
  createdAt: string
}

export const DEMO_ACCOUNTS = {
  manager: {
    email: 'manager@chainsight.demo',
    password: 'Manager123!',
  },
  employee: {
    email: 'employee@chainsight.demo',
    password: 'Employee123!',
  },
} as const

export const USERS: Record<Role, User> = {
  MANAGER: {
    id: 'usr-manager',
    name: 'Alex Chen',
    email: DEMO_ACCOUNTS.manager.email,
    role: 'MANAGER',
    assignments: [],
  },
  EMPLOYEE: {
    id: 'usr-employee',
    name: 'Jordan Lee',
    email: DEMO_ACCOUNTS.employee.email,
    role: 'EMPLOYEE',
    assignments: ['SHP-26001', 'SHP-26004', 'SHP-26008', 'SHP-26012', 'SHP-26015', 'PO-07001', 'PO-07004', 'PO-07008'],
  },
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MANAGER: [
    'inventory.read',
    'inventory.create',
    'inventory.update',
    'inventory.delete',
    'shipments.read',
    'shipments.update',
    'procurement.read',
    'procurement.create',
    'procurement.update',
    'procurement.approve',
    'suppliers.read',
    'suppliers.manage',
    'reports.read',
    'reports.export',
    'users.manage',
    'settings.manage',
  ],
  EMPLOYEE: [
    'inventory.read',
    'inventory.update',
    'shipments.read',
    'shipments.update',
    'procurement.read',
    'settings.manage',
  ],
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function signIn(email: string, password: string, remember: boolean = true): Session {
  const normalizedEmail = email.trim().toLowerCase()
  const role: Role | null =
    normalizedEmail === DEMO_ACCOUNTS.manager.email.toLowerCase() && password === DEMO_ACCOUNTS.manager.password
      ? 'MANAGER'
      : normalizedEmail === DEMO_ACCOUNTS.employee.email.toLowerCase() && password === DEMO_ACCOUNTS.employee.password
      ? 'EMPLOYEE'
      : null

  if (!role) {
    throw new Error('Invalid email or password. Try one of the demo accounts below.')
  }

  const session: Session = {
    user: USERS[role],
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    const serialized = JSON.stringify(session)
    sessionStorage.setItem('chainsight-session', serialized)
    if (remember) {
      localStorage.setItem('chainsight-session', serialized)
    } else {
      localStorage.removeItem('chainsight-session')
    }
  }

  return session
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('chainsight-session') || localStorage.getItem('chainsight-session')
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function signOut(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('chainsight-session')
    localStorage.removeItem('chainsight-session')
  }
}

export function requestPasswordReset(email: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid work email.')
  }
  return 'Demo mode: password reset instructions generated for this demo session.'
}

