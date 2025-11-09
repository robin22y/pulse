import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import BottomNavigation from './navigation/BottomNavigation.jsx'

const NAV_ITEMS = {
  owner: [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Products', path: '/owner/products', icon: 'inventory' },
    { label: 'Stock', path: '/owner/stock', icon: 'package' },
    { label: 'Staff', path: '/owner/staff', icon: 'people' },
    { label: 'Consignments', path: '/owner/consignments', icon: 'report' },
    { label: 'Create DC', path: '/consignments/create', icon: 'package' },
    { label: 'Reports', path: '/owner/reports', icon: 'report' },
    { label: 'Settings', path: '/owner/settings', icon: 'settings' },
  ],
  manager: [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Products', path: '/owner/products', icon: 'inventory' },
    { label: 'Stock', path: '/owner/stock', icon: 'package' },
    { label: 'Staff', path: '/owner/staff', icon: 'people' },
    { label: 'Consignments', path: '/owner/consignments', icon: 'report' },
    { label: 'Inventory', path: '/inventory/products', icon: 'inventory' },
    { label: 'Delivery', path: '/delivery', icon: 'delivery' },
  ],
  office: [
    { label: 'Dashboard', path: '/staff', icon: 'dashboard' },
    { label: 'Inventory', path: '/inventory/products', icon: 'inventory' },
    { label: 'Consign', path: '/consignments/create', icon: 'package' },
    { label: 'Delivery', path: '/delivery', icon: 'delivery' },
  ],
  staff: [
    { label: 'Inventory', path: '/inventory/products', icon: 'inventory' },
    { label: 'Consign', path: '/consignments/create', icon: 'package' },
    { label: 'Delivery', path: '/delivery', icon: 'delivery' },
  ],
  delivery: [
    { label: 'Deliveries', path: '/delivery', icon: 'delivery' },
  ],
}

const ShellLayout = ({ mobileOnly = false, children }) => {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = useMemo(() => {
    const role = profile?.role ?? 'staff'
    return NAV_ITEMS[role] ?? NAV_ITEMS.staff
  }, [profile?.role])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to logout', error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/90">
      {!mobileOnly && (
        <header className="backdrop-blur-md bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide text-white/90">
              FieldFlow
            </h1>
            <p className="text-sm text-white/60">
              {profile?.role ? profile.role.toUpperCase() : 'SESSION ACTIVE'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            Sign Out
          </button>
        </header>
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {children || <Outlet />}
        </div>
      </main>

      <BottomNavigation items={navItems} activePath={location.pathname} />
    </div>
  )
}

export default ShellLayout

