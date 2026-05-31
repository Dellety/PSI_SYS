import request from './request'
import type { EmailDraft } from './types'

export const getEmailDrafts = (status?: number) =>
  request.get<EmailDraft[]>('/emails', { params: { status_filter: status } })

export const getEmailDraft = (id: number) =>
  request.get<EmailDraft>(`/emails/${id}`)

export const createEmailDraft = (data: Partial<EmailDraft>) =>
  request.post<EmailDraft>('/emails', data)

export const updateEmailDraft = (id: number, data: Partial<EmailDraft>) =>
  request.put<EmailDraft>(`/emails/${id}`, data)

export const sendEmailDraft = (id: number) =>
  request.post<EmailDraft>(`/emails/${id}/send`)

export const cancelEmailDraft = (id: number) =>
  request.put<EmailDraft>(`/emails/${id}/cancel`)

export const getOrderEmailDrafts = (orderId: number) =>
  request.get<EmailDraft[]>(`/emails/order/${orderId}`)
