import request from './request'
import type { ReturnExchangeRecord, PaginatedResponse } from './types'

export const getReturns = (params: {
  page: number
  page_size: number
  status?: string
  keyword?: string
  order_id?: number
}) => request.get<PaginatedResponse<ReturnExchangeRecord>>('/returns', { params })

export const createReturn = (data: any) =>
  request.post<ReturnExchangeRecord>('/returns', data)

export const confirmReturn = (id: number) =>
  request.put(`/returns/${id}/confirm`)

export const completeReturn = (id: number) =>
  request.put(`/returns/${id}/complete`)

export const getOrderReturns = (orderId: number) =>
  request.get<ReturnExchangeRecord[]>(`/returns/order/${orderId}`)
