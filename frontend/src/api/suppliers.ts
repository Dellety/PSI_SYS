import request from './request'
import type { Supplier, PaginatedResponse } from './types'

export const getSuppliers = (params: { page: number; page_size: number; keyword?: string; cooperation_status?: number }) =>
  request.get<PaginatedResponse<Supplier>>('/suppliers', { params })

export const getSupplier = (id: number) =>
  request.get<Supplier>(`/suppliers/${id}`)

export const createSupplier = (data: any) =>
  request.post<Supplier>('/suppliers', data)

export const updateSupplier = (id: number, data: any) =>
  request.put<Supplier>(`/suppliers/${id}`, data)

export const toggleSupplierStatus = (id: number) =>
  request.put(`/suppliers/${id}/status`)

export const addSupplierMaterial = (id: number, data: any) =>
  request.post(`/suppliers/${id}/materials`, data)

export const updateSupplierMaterial = (id: number, materialId: number, data: any) =>
  request.put(`/suppliers/${id}/materials/${materialId}`, data)

export const deleteSupplierMaterial = (id: number, materialId: number) =>
  request.delete(`/suppliers/${id}/materials/${materialId}`)
