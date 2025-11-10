import { useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import BottomNavigation from './navigation/BottomNavigation.jsx'

const NAV_ITEMS = {
  owner: [
    { label: 'Dashboard', path: '/owner', icon: 'dashboard' },
    { label: 'Deliveries', path: '/owner/deliveries', icon: 'delivery' },
    { label: 'Products', path: '/owner/products', icon: 'inventory' },
    { label: 'Stock', path: '/owner/stock', icon: 'package' },
    { label: 'Staff', path: '/owner/staff', icon: 'people' },
    { label: 'Consignments', path: '/owner/consignments', icon: 'report' },
    { label: 'Settings', path: '/owner/settings', icon: 'settings' },
  ],
  admin: [
    { label: 'Dashboard', path: '/owner', icon: 'dashboard' },
    { label: 'Deliveries', path: '/owner/deliveries', icon: 'delivery' },
    { label: 'Products', path: '/owner/products', icon: 'inventory' },
    { label: 'Stock', path: '/owner/stock', icon: 'package' },
    { label: 'Staff', path: '/owner/staff', icon: 'people' },
    { label: 'Consignments', path: '/owner/consignments', icon: 'report' },
    { label: 'Settings', path: '/owner/settings', icon: 'settings' },
  ],
  manager: [
    { label: 'Team', path: '/owner/staff', icon: 'people' },
    { label: 'Deliveries', path: '/owner/deliveries', icon: 'delivery' },
    { label: 'Consignments', path: '/owner/consignments', icon: 'report' },
    { label: 'Inventory', path: '/inventory/products', icon: 'inventory' },
    { label: 'Delivery', path: '/delivery', icon: 'delivery' },
  ],
  staff: [
    { label: 'Inventory', path: '/inventory/products', icon: 'inventory' },
    { label: 'Consign', path: '/consignments/create', icon: 'package' },
    { label: 'Delivery', path: '/delivery', icon: 'delivery' },
  ],
  delivery: [{ label: 'Deliveries', path: '/delivery', icon: 'delivery' }],
}

const ShellLayout = ({ mobileOnly = false, children }) => {
  const { profile } = useAuth()
  const location = useLocation()

  const navItems = useMemo(() => {
    const role = profile?.role ?? 'staff'
    return NAV_ITEMS[role] ?? NAV_ITEMS.staff
  }, [profile?.role])

  return (
    <div className={`flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/90 ${mobileOnly ? 'md:hidden' : ''}`}>
      <main className="flex-1 overflow-y-auto px-4 pb-20 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          {children || <Outlet />}
        </div>
      </main>
      <div className="border-t border-white/10 bg-slate-950/80 py-4 text-center text-xs text-gray-400 md:pb-24">
        Powered by
        <span className="mx-1 font-bold text-gradient-blue-purple">Pulse by DigiGet</span>
        • pulse.digiget.org
      </div>
      {!mobileOnly && (
        <div className="hidden md:block">
          <BottomNavigation items={navItems} activePath={location.pathname} />
        </div>
      )}
    </div>
  )
}

export default ShellLayout

