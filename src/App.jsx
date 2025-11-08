import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OwnerDashboard from './pages/OwnerDashboard.jsx'
import StaffManagement from './pages/StaffManagement.jsx'
import HospitalManagement from './pages/HospitalManagement.jsx'
import ProductManagement from './pages/ProductManagement.jsx'
import CreateConsignment from './pages/CreateConsignment.jsx'
import DeliveryApp from './pages/DeliveryApp.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import StockLocationTracker from './pages/StockLocationTracker.jsx'
import BillingEntry from './pages/BillingEntry.jsx'
import BranchManagement from './pages/BranchManagement.jsx'
import StaffPINLogin from './pages/StaffPINLogin.jsx'
import ChangePINPage from './pages/ChangePINPage.jsx'
import ShellLayout from './components/ShellLayout.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import { resolveLandingRoute } from './utils/navigation.js'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950/80 text-slate-200">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-light border-t-primary"></div>
      </div>
    )
  }

  if (!user || !role) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

const App = () => {
  const { role } = useAuth()
  const preferredRoute = role ? resolveLandingRoute(role) : '/'

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/staff/:ownerId" element={<StaffPINLogin />} />
      <Route path="/:business/:staff" element={<StaffPINLogin />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Owner/Admin routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <OwnerDashboard />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/staff"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
            <ShellLayout>
              <StaffManagement />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/hospitals"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
            <ShellLayout>
              <HospitalManagement />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/branches"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <BranchManagement />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/reports"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <ReportsPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/stock-tracker"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
            <ShellLayout>
              <StockLocationTracker />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/billing"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <BillingEntry />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      {/* Staff routes */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={['office', 'manager']}>
            <ShellLayout>
              <StaffDashboard />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/products"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'staff']}>
            <ShellLayout>
              <ProductManagement />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consignments/create"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'staff']}>
            <ShellLayout>
              <CreateConsignment />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['delivery', 'owner', 'manager', 'staff']}>
            <ShellLayout mobileOnly>
              <DeliveryApp />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-pin"
        element={
          <ProtectedRoute>
            <ChangePINPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={preferredRoute} replace />} />
    </Routes>
  )
}

export default App
