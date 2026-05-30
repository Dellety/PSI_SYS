import request from './request'
import type { DashboardStats } from './types'

export function getDashboard() {
  return request.get<DashboardStats>('/reports/dashboard')
}

export function getOrderStatus() {
  return request.get<Record<string, number>>('/reports/order-status')
}

export function getProcurementSummary() {
  return request.get<{ supplier_id: number; count: number; total_amount: number }[]>('/reports/procurement-summary')
}
