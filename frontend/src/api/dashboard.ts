import request from './request'

// Dashboard overview
export const getOverview = () =>
  request.get<{
    active_count: number
    status_distribution: { status: string; count: number }[]
    urgent_count: number
    today_count: number
    month_count: number
  }>('/dashboard/overview')
