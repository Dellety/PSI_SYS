import request from './request'
import type { Shipment, PaginatedResponse } from './types'

export function getShipments(params?: Record<string, string | number>) {
  return request.get<PaginatedResponse<Shipment>>('/shipments', { params })
}

export function getShipment(id: number) {
  return request.get<Shipment>(`/shipments/${id}`)
}

export function createShipment(data: Record<string, unknown>) {
  return request.post('/shipments', data)
}

export function shipShipment(id: number) {
  return request.post(`/shipments/${id}/ship`)
}
