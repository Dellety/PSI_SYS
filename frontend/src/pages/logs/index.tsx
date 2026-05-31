import { useState, useEffect } from 'react'
import { Table, Card, Form, Select, DatePicker, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getLogs, type LogQueryParams } from '@/api/operationLogs'
import { RoleLabels, EmployeeRole, type OperationLog } from '@/api/types'

const { RangePicker } = DatePicker

const MODULE_OPTIONS = [
  { value: 'order', label: '订单管理' },
  { value: 'purchase', label: '采购管理' },
  { value: 'inspection', label: '验收管理' },
  { value: 'shipment', label: '发货管理' },
  { value: 'receipt', label: '签收管理' },
  { value: 'return', label: '退换货' },
  { value: 'email', label: '邮件通知' },
  { value: 'employee', label: '人员管理' },
  { value: 'material', label: '物料管理' },
  { value: 'supplier', label: '供应商管理' },
  { value: 'customer', label: '客户管理' },
]

const ROLE_MAP: Record<number, string> = {
  1: RoleLabels[EmployeeRole.ADMIN],
  2: RoleLabels[EmployeeRole.SALES],
  3: RoleLabels[EmployeeRole.PROJECT_MANAGER],
  4: RoleLabels[EmployeeRole.PURCHASER],
}

const columns: ColumnsType<OperationLog> = [
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 160,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  {
    title: '操作人',
    dataIndex: 'operator_name',
    width: 100,
  },
  {
    title: '角色',
    dataIndex: 'operator_role',
    width: 100,
    render: (v: number) => ROLE_MAP[v] || v,
  },
  {
    title: '模块',
    dataIndex: 'module',
    width: 100,
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: 120,
  },
  {
    title: '对象类型',
    dataIndex: 'target_type',
    width: 100,
  },
  {
    title: '对象ID',
    dataIndex: 'target_id',
    width: 80,
  },
  {
    title: '详情',
    dataIndex: 'detail',
    ellipsis: true,
    render: (v: string | null) => v || '-',
  },
  {
    title: 'IP',
    dataIndex: 'ip_address',
    width: 120,
    render: (v: string | null) => v || '-',
  },
]

export default function LogsPage() {
  const [data, setData] = useState<OperationLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [filters, setFilters] = useState<Partial<LogQueryParams>>({})

  const fetchData = async (p: number, ps: number, f: Partial<LogQueryParams>) => {
    setLoading(true)
    try {
      const params: LogQueryParams = {
        page: p,
        page_size: ps,
        ...f,
      }
      const res = await getLogs(params)
      const d = res.data as any
      setData(d.items || [])
      setTotal(d.total || 0)
    } catch {
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(page, pageSize, filters)
  }, [page, pageSize, filters])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const f: Partial<LogQueryParams> = {}
    if (values.module) f.module = values.module
    if (values.dateRange && values.dateRange[0]) {
      f.date_from = dayjs(values.dateRange[0]).format('YYYY-MM-DD')
      f.date_to = dayjs(values.dateRange[1]).format('YYYY-MM-DD')
    }
    setPage(1)
    setFilters(f)
  }

  const handleReset = () => {
    form.resetFields()
    setPage(1)
    setFilters({})
  }

  return (
    <div>
      <Card title="操作日志" size="small">
        <Form form={form} layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="module">
            <Select placeholder="模块" allowClear style={{ width: 140 }} options={MODULE_OPTIONS} />
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker style={{ width: 240 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <button type="button" className="ant-btn ant-btn-primary" onClick={handleSearch}>查询</button>
              <button type="button" className="ant-btn" onClick={handleReset}>重置</button>
            </Space>
          </Form.Item>
        </Form>

        <Table<OperationLog>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>
    </div>
  )
}
