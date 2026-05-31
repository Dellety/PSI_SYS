import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Spin, message } from 'antd'
import {
  FileTextOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { getOverview } from '@/api/dashboard'
import { OrderStatusLabels } from '@/api/types'

interface OverviewData {
  active_count: number
  status_distribution: { status: string; count: number }[]
  urgent_count: number
  today_count: number
  month_count: number
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOverview()
      .then((res) => setData(res.data))
      .catch(() => {
        message.error('获取仪表盘数据失败')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) return null

  // Pie chart option for status distribution
  const pieOption = {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical' as const,
      right: 10,
      top: 'center' as const,
      type: 'scroll' as const,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold' as const,
          },
        },
        data: data.status_distribution.map((item) => ({
          name: (OrderStatusLabels as any)[item.status] || item.status,
          value: item.count,
        })),
      },
    ],
  }

  const cards = [
    { title: '在途订单', value: data.active_count, icon: <FileTextOutlined />, color: '#1890ff' },
    { title: '加急订单', value: data.urgent_count, icon: <ThunderboltOutlined />, color: '#ff4d4f' },
    { title: '今日新增', value: data.today_count, icon: <RiseOutlined />, color: '#52c41a' },
    { title: '本月新增', value: data.month_count, icon: <CalendarOutlined />, color: '#722ed1' },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        {cards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card>
              <Statistic
                title={item.title}
                value={item.value}
                prefix={
                  <span style={{ color: item.color, marginRight: 8 }}>{item.icon}</span>
                }
                valueStyle={item.title === '加急订单' ? { color: '#ff4d4f' } : undefined}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="订单状态分布" style={{ marginTop: 16 }}>
        <ReactECharts option={pieOption} style={{ height: 380 }} />
      </Card>
    </div>
  )
}
