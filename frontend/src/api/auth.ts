import request from './request'
import type { LoginRequest, TokenResponse, User } from './types'

export function login(data: LoginRequest) {
  return request.post<TokenResponse>('/auth/login', data)
}

export function refreshToken(refreshToken: string) {
  return request.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken })
}

export function getMe() {
  return request.get<User>('/auth/me')
}
