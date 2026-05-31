import request from './request'
import type { PaginatedResponse } from './types'

export const getOrders = (params: {
  page: number
  page_size: number
  status?: string
  customer_id?: number
  is_urgent?: number
  keyword?: string
}) => request.get<PaginatedResponse<any>>('/orders', { params })

export const getOrder = (id: number) =>
  request.get<any>(`/orders/${id}`)

export const createOrder = (data: any) =>
  request.post('/orders', data)

export const updateOrder = (id: number, data: any) =>
  request.put(`/orders/${id}`, data)

export const changeOrderStatus = (id: number, target_status: string) =>
  request.put(`/orders/${id}/status`, { target_status })

export const updateContractInfo = (id: number, data: any) =>
  request.put(`/orders/${id}/contract`, data)

export const closeOrder = (id: number) =>
  request.post(`/orders/${id}/close`)

export const getOrderActions = (id: number) =>
  request.get<{ current_status: string; actions: { status: string; label: string }[] }>(`/orders/${id}/actions`)

export const getOrderStatuses = () =>
  request.get<{ value: string; label: string }[]>('/orders/meta/statuses')
