import { useEffect, useState } from 'react'
import { Tabs, Card, Table, Spin, Tag, message, Row, Col } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import * as reportsApi from '@/api/reports'
import { OrderStatusLabels } from '@/api/types'

// ==================== Tab 1: 订单概览 ====================
function OrderOverviewTab() {
  const [loading, setLoading] = useState(true)
  const [statusDist, setStatusDist] = useState<{ status: string; count: number }[]>([])
  const [urgentOrders, setUrgentOrders] = useState<any[]>([])

  useEffect(() => {
    reportsApi
      .getOrderOverview()
      .then((res) => {
        setStatusDist(res.data.status_distribution)
        setUrgentOrders(res.data.urgent_orders)
      })
      .catch(() => message.error('获取订单概览失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical' as const, right: 10, top: 'center', type: 'scroll' as const },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' as const } },
        data: statusDist.map((item) => ({
          name: (OrderStatusLabels as any)[item.status] || item.status,
          value: item.count,
        })),
      },
    ],
  }

  const urgentColumns: ColumnsType<any> = [
    { title: '订单编号', dataIndex: 'order_no', width: 150 },
    { title: '客户名称', dataIndex: 'customer_name', width: 160 },
    {
      title: '合同金额',
      dataIndex: 'total_amount',
      width: 130,
      align: 'right' as const,
      render: (v: number) =>
        v != null
          ? `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '-',
    },
    {
      title: '货期',
      dataIndex: 'delivery_date',
      width: 110,
      render: (v: string | null) => v || '-',
    },
  ]

  return (
    <div>
      <Card title="订单状态分布" style={{ marginBottom: 16 }}>
        <ReactECharts option={pieOption} style={{ height: 350 }} />
      </Card>
      <Card title="加急订单">
        <Table
          rowKey="id"
          columns={urgentColumns}
          dataSource={urgentOrders}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无加急订单' }}
        />
      </Card>
    </div>
  )
}

// ==================== Tab 2: 超期预警 ====================
function OverdueTab() {
  const [loading, setLoading] = useState(true)
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [overdue, setOverdue] = useState<any[]>([])

  useEffect(() => {
    reportsApi
      .getOverdue()
      .then((res) => {
        setUpcoming(res.data.upcoming)
        setOverdue(res.data.overdue)
      })
      .catch(() => message.error('获取超期预警数据失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  const upcomingColumns: ColumnsType<any> = [
    { title: '订单编号', dataIndex: 'order_no', width: 150 },
    { title: '客户名称', dataIndex: 'customer_name', width: 160 },
    { title: '货期', dataIndex: 'delivery_date', width: 110, render: (v: string | null) => v || '-' },
    {
      title: '剩余天数',
      dataIndex: 'days_remaining',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Tag color="orange">{v} 天</Tag>,
    },
  ]

  const overdueColumns: ColumnsType<any> = [
    { title: '订单编号', dataIndex: 'order_no', width: 150 },
    { title: '客户名称', dataIndex: 'customer_name', width: 160 },
    { title: '货期', dataIndex: 'delivery_date', width: 110, render: (v: string | null) => v || '-' },
    {
      title: '超期天数',
      dataIndex: 'days_overdue',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Tag color="red">{v} 天</Tag>,
    },
  ]

  return (
    <div>
      <Card title="即将超期订单" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          columns={upcomingColumns}
          dataSource={upcoming}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无即将超期订单' }}
        />
      </Card>
      <Card title="已超期订单">
        <Table
          rowKey="id"
          columns={overdueColumns}
          dataSource={overdue}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无超期订单' }}
        />
      </Card>
    </div>
  )
}

// ==================== Tab 3: 采购汇总 ====================
function PurchaseSummaryTab() {
  const [loading, setLoading] = useState(true)
  const [byMonth, setByMonth] = useState<any[]>([])
  const [bySupplier, setBySupplier] = useState<any[]>([])
  const [byCategory, setByCategory] = useState<any[]>([])

  useEffect(() => {
    reportsApi
      .getPurchaseSummary()
      .then((res) => {
        setByMonth(res.data.by_month)
        setBySupplier(res.data.by_supplier)
        setByCategory(res.data.by_category)
      })
      .catch(() => message.error('获取采购汇总数据失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  const lineOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: byMonth.map((i) => i.month) },
    yAxis: { type: 'value' as const, axisLabel: { formatter: '¥{value}' } },
    series: [
      {
        type: 'line',
        data: byMonth.map((i) => i.amount),
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#1890ff' },
      },
    ],
    grid: { left: 80, right: 30, bottom: 30, top: 20 },
  }

  const barOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: bySupplier.map((i) => i.supplier_name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' as const, axisLabel: { formatter: '¥{value}' } },
    series: [
      {
        type: 'bar',
        data: bySupplier.map((i) => i.amount),
        itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
      },
    ],
    grid: { left: 80, right: 30, bottom: 60, top: 20 },
  }

  const categoryColumns: ColumnsType<any> = [
    { title: '品类', dataIndex: 'category', width: 160 },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 120,
      align: 'right' as const,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 150,
      align: 'right' as const,
      render: (v: number) =>
        `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="月度采购金额">
            <ReactECharts option={lineOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="供应商采购金额排名">
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
      <Card title="品类采购统计" style={{ marginTop: 16 }}>
        <Table
          rowKey="category"
          columns={categoryColumns}
          dataSource={byCategory}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>
    </div>
  )
}

// ==================== Tab 4: 供应商分析 ====================
function SupplierAnalysisTab() {
  const [loading, setLoading] = useState(true)
  const [deliveryRate, setDeliveryRate] = useState<any[]>([])
  const [qualityDist, setQualityDist] = useState<any[]>([])
  const [frequencyTop10, setFrequencyTop10] = useState<any[]>([])

  useEffect(() => {
    reportsApi
      .getSupplierAnalysis()
      .then((res) => {
        setDeliveryRate(res.data.delivery_rate)
        setQualityDist(res.data.quality_distribution)
        setFrequencyTop10(res.data.frequency_top10)
      })
      .catch(() => message.error('获取供应商分析数据失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  const barOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0]
        return `${p.name}<br/>准时率: ${p.value}%`
      },
    },
    xAxis: {
      type: 'category' as const,
      data: deliveryRate.map((i) => i.supplier_name),
      axisLabel: { rotate: 30 },
    },
    yAxis: {
      type: 'value' as const,
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        type: 'bar',
        data: deliveryRate.map((i) => i.on_time_rate),
        itemStyle: {
          color: (params: any) => {
            const val = params.value
            if (val >= 90) return '#52c41a'
            if (val >= 70) return '#faad14'
            return '#ff4d4f'
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
    grid: { left: 60, right: 30, bottom: 60, top: 20 },
  }

  const qualityLabels: Record<string, string> = { excellent: '优', good: '良', poor: '差' }
  const qualityColors: Record<string, string> = { excellent: '#52c41a', good: '#faad14', poor: '#ff4d4f' }

  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' as const } },
        data: qualityDist.map((item) => ({
          name: qualityLabels[item.rating] || item.rating,
          value: item.count,
          itemStyle: { color: qualityColors[item.rating] },
        })),
      },
    ],
  }

  const freqColumns: ColumnsType<any> = [
    { title: '供应商', dataIndex: 'supplier_name', width: 200 },
    {
      title: '采购次数',
      dataIndex: 'count',
      width: 120,
      align: 'right' as const,
      sorter: (a: any, b: any) => a.count - b.count,
    },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card title="交货准时率">
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="质量评级分布">
            <ReactECharts option={pieOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
      <Card title="采购频次 Top 10" style={{ marginTop: 16 }}>
        <Table
          rowKey="supplier_name"
          columns={freqColumns}
          dataSource={frequencyTop10}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>
    </div>
  )
}

// ==================== Tab 5: 销售业绩 ====================
function SalesPerformanceTab() {
  const [loading, setLoading] = useState(true)
  const [bySales, setBySales] = useState<any[]>([])
  const [byCustomer, setByCustomer] = useState<any[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])

  useEffect(() => {
    reportsApi
      .getSalesPerformance()
      .then((res) => {
        setBySales(res.data.by_sales)
        setByCustomer(res.data.by_customer)
        setMonthlyTrend(res.data.monthly_trend)
      })
      .catch(() => message.error('获取销售业绩数据失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin size="large" />
      </div>
    )
  }

  const salesBarOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: bySales.map((i) => i.sales_name) },
    yAxis: { type: 'value' as const, axisLabel: { formatter: '¥{value}' } },
    series: [
      {
        type: 'bar',
        data: bySales.map((i) => i.total_amount),
        itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
      },
    ],
    grid: { left: 80, right: 30, bottom: 30, top: 20 },
  }

  const trendLineOption = {
    tooltip: { trigger: 'axis' as const },
    xAxis: { type: 'category' as const, data: monthlyTrend.map((i) => i.month) },
    yAxis: { type: 'value' as const, axisLabel: { formatter: '¥{value}' } },
    series: [
      {
        type: 'line',
        data: monthlyTrend.map((i) => i.amount),
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#722ed1' },
      },
    ],
    grid: { left: 80, right: 30, bottom: 30, top: 20 },
  }

  const customerColumns: ColumnsType<any> = [
    { title: '客户名称', dataIndex: 'customer_name', width: 200 },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 180,
      align: 'right' as const,
      render: (v: number) =>
        `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sorter: (a: any, b: any) => a.amount - b.amount,
    },
  ]

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="销售人员业绩">
            <ReactECharts option={salesBarOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="月度销售趋势">
            <ReactECharts option={trendLineOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>
      <Card title="客户金额排名" style={{ marginTop: 16 }}>
        <Table
          rowKey="customer_name"
          columns={customerColumns}
          dataSource={byCustomer}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>
    </div>
  )
}

// ==================== Main Reports Page ====================
export default function ReportsPage() {
  const items = [
    { key: 'order-overview', label: '订单概览', children: <OrderOverviewTab /> },
    { key: 'overdue', label: '超期预警', children: <OverdueTab /> },
    { key: 'purchase', label: '采购汇总', children: <PurchaseSummaryTab /> },
    { key: 'supplier', label: '供应商分析', children: <SupplierAnalysisTab /> },
    { key: 'sales', label: '销售业绩', children: <SalesPerformanceTab /> },
  ]

  return <Tabs defaultActiveKey="order-overview" items={items} />
}
