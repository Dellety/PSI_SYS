import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/layouts/MainLayout'
import LoginPage from '@/pages/login'
import DashboardPage from '@/pages/dashboard'
import EmployeePage from '@/pages/employees'
import MaterialPage from '@/pages/materials'
import SupplierPage from '@/pages/suppliers'
import CustomerPage from '@/pages/customers'
import OrderListPage from '@/pages/orders'
import OrderDetailPage from '@/pages/orders/DetailPage'
import PurchaseListPage from '@/pages/purchases'
import ShipmentListPage from '@/pages/shipments'
import ReportsPage from '@/pages/reports'
import LogsPage from '@/pages/logs'
import EmailsPage from '@/pages/emails'
import SettingsPage from '@/pages/settings'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore()
  const [loading, setLoading] = useState(isAuthenticated && !useAuthStore.getState().user)

  useEffect(() => {
    if (isAuthenticated && !useAuthStore.getState().user) {
      loadUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, loadUser])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeePage />} />
          <Route path="materials" element={<MaterialPage />} />
          <Route path="suppliers" element={<SupplierPage />} />
          <Route path="customers" element={<CustomerPage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="purchases" element={<PurchaseListPage />} />
          <Route path="shipments" element={<ShipmentListPage />} />
          <Route path="emails" element={<EmailsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
