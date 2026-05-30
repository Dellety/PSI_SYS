import request from './request'
import type { Procurement, PaginatedResponse } from './types'

export function getProcurements(params?: Record<string, string | number>) {
  return request.get<PaginatedResponse<Procurement>>('/procurements', { params })
}

export function getProcurement(id: number) {
  return request.get<Procurement>(`/procurements/${id}`)
}

export function createProcurement(data: Record<string, unknown>) {
  return request.post('/procurements', data)
}

export function createProcurementFromOrder(orderId: number, supplierId: number) {
  return request.post(`/procurements/from-order/${orderId}`, null, {
    params: { supplier_id: supplierId },
  })
}

export function confirmProcurement(id: number) {
  return request.post(`/procurements/${id}/confirm`)
}
