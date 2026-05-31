import request from './request'
import type { ReceiptRecord } from './types'

export const createReceipt = (data: any) =>
  request.post<ReceiptRecord>('/receipts', data)

export const archiveReceipt = (id: number, data: any) =>
  request.put(`/receipts/${id}/archive`, data)

export const getOrderReceipts = (orderId: number) =>
  request.get<ReceiptRecord[]>(`/receipts/order/${orderId}`)
