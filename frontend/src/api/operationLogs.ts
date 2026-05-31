import request from './request'
import type { OperationLog, PaginatedResponse } from './types'

export interface LogQueryParams {
  page: number
  page_size: number
  operator_id?: number
  module?: string
  action?: string
  target_type?: string
  date_from?: string
  date_to?: string
}

export const getLogs = (params: LogQueryParams) =>
  request.get<PaginatedResponse<OperationLog>>('/logs', { params })

export const getOrderLogs = (orderId: number) =>
  request.get<OperationLog[]>(`/logs/order/${orderId}`)
