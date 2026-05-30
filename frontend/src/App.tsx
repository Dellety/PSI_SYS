import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/layouts/MainLayout'
import LoginPage from '@/pages/login'
import DashboardPage from '@/pages/dashboard'
import OrdersPage from '@/pages/orders'
import ProcurementsPage from '@/pages/procurements'
import ShipmentsPage from '@/pages/shipments'
import DeliveriesPage from '@/pages/deliveries'
import ReportsPage from '@/pages/reports'
import CustomersPage from '@/pages/customers'
import SuppliersPage from '@/pages/suppliers'
import PartsPage from '@/pages/parts'
import UsersPage from '@/pages/users'

function PlaceholderPage({ title }: { title: string }) {
  return <div style={{ textAlign: 'center', padding: 48 }}>
    <h2>{title}</h2>
    <p style={{ color: '#999', marginTop: 8 }}>功能开发中...</p>
  </div>
}

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
          <Route path="orders" element={<OrdersPage />} />
          <Route path="procurements" element={<ProcurementsPage />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="parts" element={<PartsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
