import request from './request'
import type { Part, PaginatedResponse } from './types'

export function getParts(params: { page: number; page_size: number; keyword?: string }) {
  return request.get<PaginatedResponse<Part>>('/parts', { params })
}

export function getPart(id: number) {
  return request.get<Part>(`/parts/${id}`)
}

export function createPart(data: Partial<Part>) {
  return request.post<Part>('/parts', data)
}

export function updatePart(id: number, data: Partial<Part>) {
  return request.put<Part>(`/parts/${id}`, data)
}

export function deletePart(id: number) {
  return request.delete(`/parts/${id}`)
}
