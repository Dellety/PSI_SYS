import request from './request'
import type { Material, PaginatedResponse } from './types'

export const getMaterials = (params: { page: number; page_size: number; keyword?: string; category?: string }) =>
  request.get<PaginatedResponse<Material>>('/materials', { params })

export const getMaterial = (id: number) =>
  request.get<Material>(`/materials/${id}`)

export const createMaterial = (data: any) =>
  request.post<Material>('/materials', data)

export const updateMaterial = (id: number, data: any) =>
  request.put<Material>(`/materials/${id}`, data)

export const toggleMaterialStatus = (id: number) =>
  request.put(`/materials/${id}/status`)

export const getSimpleMaterials = () =>
  request.get<Material[]>('/materials/simple-list')
