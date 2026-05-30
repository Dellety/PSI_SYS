import request from './request'
import type { Order, PaginatedResponse } from './types'

export function getOrders(params?: Record<string, string | number>) {
  return request.get<PaginatedResponse<Order>>('/orders', { params })
}

export function getOrder(id: number) {
  return request.get<Order>(`/orders/${id}`)
}

export function createOrder(data: Record<string, unknown>) {
  return request.post('/orders', data)
}

export function updateOrder(id: number, data: Record<string, unknown>) {
  return request.put(`/orders/${id}`, data)
}

export function confirmOrder(id: number) {
  return request.post(`/orders/${id}/confirm`)
}

export function cancelOrder(id: number) {
  return request.post(`/orders/${id}/cancel`)
}
