import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, message } from 'antd'
import ReactECharts from 'echarts-for-react'
import { getDashboard, getOrderStatus, getProcurementSummary } from '@/api/reports'
import request from '@/api/request'
import type { DashboardStats, Supplier, PaginatedResponse } from '@/api/types'

export default function ReportsPage() {
  const [orderStatusData, setOrderStatusData] = useState<Record<string, number>>({})
  const [procurementData, setProcurementData] = useState<{ supplier_id: number; count: number; total_amount: number }[]>([])
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null)
  const [supplierMap, setSupplierMap] = useState<Record<number, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, oRes, pRes, sRes] = await Promise.all([
          getDashboard(),
          getOrderStatus(),
          getProcurementSummary(),
          request.get<PaginatedResponse<Supplier>>('/suppliers', { params: { page_size: 100 } }),
        ])
        setDashboard(dRes.data)
        setOrderStatusData(oRes.data)
        setProcurementData(pRes.data)
        setSupplierMap(Object.fromEntries(sRes.data.items.map((s) => [s.id, s.name])))
      } catch {
        message.error('加载报表数据失败')
      }
    }
    fetchData()
  }, [])

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    in_procurement: '采购中',
    in_shipping: '发货中',
    delivered: '已交货',
    closed: '已关闭',
    cancelled: '已取消',
  }

  const pieOption = {
    title: { text: '订单状态分布', left: 'center' },
    tooltip: { trigger: 'item' as const },
    legend: { orient: 'vertical' as const, left: 'left' },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: Object.entries(orderStatusData).map(([key, value]) => ({
          name: statusLabels[key] || key,
          value,
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' },
        },
      },
    ],
  }

  const barOption = {
    title: { text: '采购汇总（按供应商）', left: 'center' },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: procurementData.map((item) => supplierMap[item.supplier_id] || `供应商#${item.supplier_id}`),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value' as const, name: '金额 (¥)' },
    series: [
      {
        type: 'bar',
        data: procurementData.map((item) => item.total_amount),
        itemStyle: { color: '#1890ff' },
      },
    ],
  }

  return (
    <div>
      {dashboard && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card><Statistic title="订单总数" value={Object.values(dashboard.order_counts ?? {}).reduce((a: number, b: number) => a + b, 0)} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="采购总数" value={Object.values(dashboard.procurement_counts ?? {}).reduce((a: number, b: number) => a + b, 0)} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="待发货" value={dashboard.pending_shipment_count} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="待交货" value={dashboard.pending_delivery_count} /></Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <ReactECharts option={pieOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <ReactECharts option={barOption} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
