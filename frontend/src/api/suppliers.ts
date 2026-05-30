import request from './request'
import type { Supplier, PaginatedResponse } from './types'

export function getSuppliers(params: { page: number; page_size: number; keyword?: string }) {
  return request.get<PaginatedResponse<Supplier>>('/suppliers', { params })
}

export function getSupplier(id: number) {
  return request.get<Supplier>(`/suppliers/${id}`)
}

export function createSupplier(data: Partial<Supplier>) {
  return request.post<Supplier>('/suppliers', data)
}

export function updateSupplier(id: number, data: Partial<Supplier>) {
  return request.put<Supplier>(`/suppliers/${id}`, data)
}

export function deleteSupplier(id: number) {
  return request.delete(`/suppliers/${id}`)
}
