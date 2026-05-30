import request from './request'
import type { Customer, PaginatedResponse } from './types'

export function getCustomers(params: { page: number; page_size: number; keyword?: string }) {
  return request.get<PaginatedResponse<Customer>>('/customers', { params })
}

export function getCustomer(id: number) {
  return request.get<Customer>(`/customers/${id}`)
}

export function createCustomer(data: Partial<Customer>) {
  return request.post<Customer>('/customers', data)
}

export function updateCustomer(id: number, data: Partial<Customer>) {
  return request.put<Customer>(`/customers/${id}`, data)
}

export function deleteCustomer(id: number) {
  return request.delete(`/customers/${id}`)
}
