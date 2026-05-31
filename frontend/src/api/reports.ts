import request from './request'

// Order overview
export const getOrderOverview = () =>
  request.get<{
    status_distribution: { status: string; count: number }[]
    urgent_orders: {
      id: number
      order_no: string
      customer_name: string
      delivery_date: string | null
      total_amount: number
    }[]
  }>('/reports/order-overview')

// Overdue / upcoming
export const getOverdue = () =>
  request.get<{
    upcoming: {
      id: number
      order_no: string
      customer_name: string
      delivery_date: string | null
      days_remaining: number
    }[]
    overdue: {
      id: number
      order_no: string
      customer_name: string
      delivery_date: string | null
      days_overdue: number
    }[]
  }>('/reports/overdue')

// Purchase summary
export const getPurchaseSummary = () =>
  request.get<{
    by_month: { month: string; amount: number }[]
    by_supplier: { supplier_name: string; amount: number; count: number }[]
    by_category: { category: string; quantity: number; amount: number }[]
  }>('/reports/purchase-summary')

// Supplier analysis
export const getSupplierAnalysis = () =>
  request.get<{
    delivery_rate: { supplier_name: string; on_time_rate: number }[]
    quality_distribution: { rating: string; count: number }[]
    frequency_top10: { supplier_name: string; count: number }[]
  }>('/reports/supplier-analysis')

// Sales performance
export const getSalesPerformance = () =>
  request.get<{
    by_sales: { sales_name: string; total_amount: number; order_count: number }[]
    by_customer: { customer_name: string; amount: number }[]
    monthly_trend: { month: string; amount: number }[]
  }>('/reports/sales-performance')
