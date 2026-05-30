import request from './request'
import type { User, PaginatedResponse } from './types'

export function getUsers(params: { page: number; page_size: number; keyword?: string }) {
  return request.get<PaginatedResponse<User>>('/users', { params })
}

export function getUser(id: number) {
  return request.get<User>(`/users/${id}`)
}

export function createUser(data: Partial<User> & { password: string }) {
  return request.post<User>('/users', data)
}

export function updateUser(id: number, data: Partial<User>) {
  return request.put<User>(`/users/${id}`, data)
}

export function deleteUser(id: number) {
  return request.delete(`/users/${id}`)
}
