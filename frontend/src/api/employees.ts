import request from './request'
import type { Employee, PaginatedResponse } from './types'

export const getEmployees = (params: { page: number; page_size: number; keyword?: string; role?: string }) =>
  request.get<PaginatedResponse<Employee>>('/employees', { params })

export const getEmployee = (id: number) =>
  request.get<Employee>(`/employees/${id}`)

export const createEmployee = (data: any) =>
  request.post<Employee>('/employees', data)

export const updateEmployee = (id: number, data: any) =>
  request.put<Employee>(`/employees/${id}`, data)

export const toggleEmployeeStatus = (id: number) =>
  request.put(`/employees/${id}/status`)

export const getSimpleEmployees = () =>
  request.get<Employee[]>('/employees/simple-list')
