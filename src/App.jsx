import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import OwnerDashboard from './pages/OwnerDashboard.jsx'
import UserManagement from './pages/UserManagement.jsx'
import HospitalManagement from './pages/HospitalManagement.jsx'
import ProductMaster from './pages/ProductMaster.jsx'
import ProductManagement from './pages/ProductManagement.jsx'
import CreateConsignment from './pages/CreateConsignment.jsx'
import DeliveryApp from './pages/DeliveryApp.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import StockLocationTracker from './pages/StockLocationTracker.jsx'
import BillingEntry from './pages/BillingEntry.jsx'
import BranchManagement from './pages/BranchManagement.jsx'
import ShellLayout from './components/ShellLayout.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ConsignmentsList from './pages/ConsignmentsList.jsx'
import DCPreviewPage from './pages/DCPreviewPage.jsx'
import DeliverySummaryPage from './pages/DeliverySummaryPage.jsx'
import StockManagementPage from './pages/StockManagementPage'
import { resolveLandingRoute } from './utils/navigation.js'
import Signup from './pages/Signup.jsx'

const App = () => {
  const { role } = useAuth()
  const preferredRoute = role ? resolveLandingRoute(role) : '/login'

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Owner/Admin area */}
      <Route
        path="/owner"
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
              <UserManagement />
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
        path="/owner/products"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <ProductMaster />
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
        path="/owner/stock"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <StockManagementPage />
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
      <Route
        path="/owner/settings"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <ShellLayout>
              <SettingsPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/consignments"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
            <ShellLayout>
              <ConsignmentsList />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/consignments/:id"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager', 'delivery']}>
            <DCPreviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/deliveries"
        element={
          <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
            <ShellLayout>
              <DeliverySummaryPage />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      {/* Staff area */}
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

      {/* Shared inventory/consignment routes */}
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

      {/* Delivery area */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['delivery', 'owner', 'manager', 'staff']}>
            <ShellLayout>
              <DeliveryApp />
            </ShellLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={preferredRoute} replace />} />
    </Routes>
  )
}

export default App
