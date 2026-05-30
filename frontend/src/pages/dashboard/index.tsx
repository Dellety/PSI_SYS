import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Spin } from 'antd'
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  SendOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import request from '@/api/request'
import type { DashboardStats } from '@/api/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    request
      .get<DashboardStats>('/reports/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => {
        setStats({ order_counts: {}, procurement_counts: {}, pending_shipment_count: 0, pending_delivery_count: 0, month_order_total: 0 })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>
  }

  // Sum up order counts for display
  const orderCounts = stats?.order_counts ?? {}
  const totalOrders = Object.values(orderCounts).reduce((a, b) => a + b, 0)
  const procurementCounts = stats?.procurement_counts ?? {}
  const totalProcurements = Object.values(procurementCounts).reduce((a, b) => a + b, 0)

  const cards = [
    { title: '订单总数', value: totalOrders, icon: <FileTextOutlined />, color: '#1890ff' },
    { title: '采购总数', value: totalProcurements, icon: <ShoppingCartOutlined />, color: '#faad14' },
    { title: '待发货', value: stats?.pending_shipment_count ?? 0, icon: <SendOutlined />, color: '#722ed1' },
    { title: '待交货', value: stats?.pending_delivery_count ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
  ]

  return (
    <Row gutter={[16, 16]}>
      {cards.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <Card>
            <Statistic
              title={item.title}
              value={item.value}
              prefix={<span style={{ color: item.color, marginRight: 8 }}>{item.icon}</span>}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
