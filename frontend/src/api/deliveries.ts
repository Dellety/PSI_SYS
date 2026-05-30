import request from './request'
import type { Delivery, PaginatedResponse } from './types'

export function getDeliveries(params?: Record<string, string | number>) {
  return request.get<PaginatedResponse<Delivery>>('/deliveries', { params })
}

export function getDelivery(id: number) {
  return request.get<Delivery>(`/deliveries/${id}`)
}

export function createDelivery(data: Record<string, unknown>) {
  return request.post('/deliveries', data)
}

export function confirmDelivery(id: number, data: { receiver_name: string; receiver_phone: string; notes?: string }) {
  return request.post(`/deliveries/${id}/confirm`, data)
}

export function acceptDelivery(id: number) {
  return request.post(`/deliveries/${id}/accept`)
}
