import request from './request'
import type { PaginatedResponse, PurchaseOrder } from './types'

export const getPurchases = (params: {
  page: number
  page_size: number
  status?: string
  supplier_id?: number
  keyword?: string
  order_id?: number
}) => request.get<PaginatedResponse<PurchaseOrder>>('/purchases', { params })

export const createPurchase = (data: any) =>
  request.post<PurchaseOrder>('/purchases', data)

export const updatePurchaseStatus = (id: number, data: { status: string }) =>
  request.put(`/purchases/${id}/status`, data)

export const getPurchase = (id: number) =>
  request.get<PurchaseOrder>(`/purchases/${id}`)

export const getOrderPurchases = (orderId: number) =>
  request.get<PurchaseOrder[]>(`/purchases/order/${orderId}`)
