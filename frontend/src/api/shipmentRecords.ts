import request from './request'
import type { ShipmentRecord, PaginatedResponse } from './types'

export const getShipments = (params: {
  page: number
  page_size: number
  keyword?: string
  order_id?: number
}) => request.get<PaginatedResponse<ShipmentRecord>>('/shipments', { params })

export const createShipment = (data: any) =>
  request.post<ShipmentRecord>('/shipments', data)

export const getOrderShipments = (orderId: number) =>
  request.get<ShipmentRecord[]>(`/shipments/order/${orderId}`)

export const confirmAddress = (id: number) =>
  request.put(`/shipments/${id}/address-confirm`)

export const updateTracking = (id: number, data: { express_company?: string; tracking_no?: string }) =>
  request.put(`/shipments/${id}/tracking`, data)
