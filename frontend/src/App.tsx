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
          <Route path="employees" element={<EmployeePage />} />
          <Route path="materials" element={<MaterialPage />} />
          <Route path="suppliers" element={<SupplierPage />} />
          <Route path="customers" element={<CustomerPage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="purchases" element={<PlaceholderPage title="采购管理" />} />
          <Route path="emails" element={<PlaceholderPage title="邮件通知" />} />
          <Route path="logs" element={<PlaceholderPage title="操作日志" />} />
          <Route path="reports" element={<PlaceholderPage title="统计报表" />} />
          <Route path="settings" element={<PlaceholderPage title="系统配置" />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
