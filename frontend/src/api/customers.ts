import request from './request'
import type { Customer, PaginatedResponse } from './types'

export const getCustomers = (params: { page: number; page_size: number; keyword?: string }) =>
  request.get<PaginatedResponse<Customer>>('/customers', { params })

export const getCustomer = (id: number) =>
  request.get<Customer>(`/customers/${id}`)

export const createCustomer = (data: any) =>
  request.post<Customer>('/customers', data)

export const updateCustomer = (id: number, data: any) =>
  request.put<Customer>(`/customers/${id}`, data)

export const toggleCustomerStatus = (id: number) =>
  request.put(`/customers/${id}/status`)

export const getSimpleCustomers = () =>
  request.get('/customers/simple-list')

export const addCustomerAddress = (id: number, data: any) =>
  request.post(`/customers/${id}/addresses`, data)

export const updateCustomerAddress = (id: number, addressId: number, data: any) =>
  request.put(`/customers/${id}/addresses/${addressId}`, data)

export const deleteCustomerAddress = (id: number, addressId: number) =>
  request.delete(`/customers/${id}/addresses/${addressId}`)

export const addCustomerInvoice = (id: number, data: any) =>
  request.post(`/customers/${id}/invoices`, data)

export const updateCustomerInvoice = (id: number, invoiceId: number, data: any) =>
  request.put(`/customers/${id}/invoices/${invoiceId}`, data)
