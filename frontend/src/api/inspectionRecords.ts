import request from './request'
import type { InspectionRecord } from './types'

export const createInspection = (data: any) =>
  request.post<InspectionRecord>('/inspections', data)

export const getPurchaseInspection = (purchaseId: number) =>
  request.get<InspectionRecord>(`/inspections/purchase/${purchaseId}`)

export const getOrderInspections = (orderId: number) =>
  request.get<InspectionRecord[]>(`/inspections/order/${orderId}`)

export const confirmInspection = (orderId: number) =>
  request.put(`/inspections/${orderId}/status`)
