import request from './request'
import type { SystemConfig } from './types'

export const getSettings = () =>
  request.get<SystemConfig[]>('/settings')

export const getSetting = (key: string) =>
  request.get<SystemConfig>(`/settings/${key}`)

export const updateSetting = (key: string, data: { config_value: string; description?: string | null }) =>
  request.put<SystemConfig>(`/settings/${key}`, data)

export const createSetting = (data: { config_key: string; config_value: string; config_type?: string; description?: string | null }) =>
  request.post<SystemConfig>('/settings', data)
