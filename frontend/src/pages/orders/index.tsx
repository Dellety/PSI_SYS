import { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Space, Select, Tag, message, Modal, Form,
  Switch, DatePicker, InputNumber, Card, Divider, Row, Col,
} from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, ThunderboltFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as orderApi from '@/api/contractOrders'
import { OrderStatus, OrderStatusLabels } from '@/api/types'
import { getSimpleCustomers } from '@/api/customers'
import { getSimpleEmployees } from '@/api/employees'
import { getSimpleMaterials } from '@/api/materials'

// ---------- status color mapping ----------
const STATUS_COLORS: Record<string, string> = {
  pending_confirm: 'orange',
  pending_quote: 'orange',
  pending_contract: 'orange',
  pending_dispatch: 'blue',
  pending_purchase: 'blue',
  purchasing: 'blue',
  pending_inspect: 'blue',
  inspecting: 'blue',
  pending_ship: 'blue',
  shipped: 'green',
  pending_receipt: 'green',
  received: 'green',
  closed: 'default',
  cancelled: 'default',
  return_exchange: 'red',
}

// ---------- status options ----------
const statusOptions = Object.entries(OrderStatusLabels).map(([value, label]) => ({
  value,
  label,
}))

// ---------- list item type ----------
interface OrderListItem {
  id: number
  order_no: string
  contract_no: string | null
  customer_id: number
  customer_name: string
  sales_id: number
  sales_name: string
  project_manager_id: number
  project_manager_name: string
  total_amount: number
  delivery_date: string | null
  is_urgent: number
  status: OrderStatus
  item_count: number
  created_at: string
}

export default function OrderListPage() {
  const navigate = useNavigate()

  // list state
  const [data, setData] = useState<OrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [customerFilter, setCustomerFilter] = useState<number | undefined>(undefined)
  const [urgentFilter, setUrgentFilter] = useState<number | undefined>(undefined)

  // create modal state
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // dropdown data
  const [customers, setCustomers] = useState<{ value: number; label: string }[]>([])
  const [projectManagers, setProjectManagers] = useState<{ value: number; label: string }[]>([])
  const [materials, setMaterials] = useState<any[]>([])

  // ---------- fetch dropdown options ----------
  useEffect(() => {
    getSimpleCustomers().then((res) => {
      const list = res.data as any[]
      setCustomers(list.map((c: any) => ({ value: c.id, label: c.name })))
    }).catch(() => {})
    getSimpleEmployees().then((res) => {
      const list = res.data as any[]
      setProjectManagers(
        list
          .filter((e: any) => e.role === 'project_manager')
          .map((e: any) => ({ value: e.id, label: e.name })),
      )
    }).catch(() => {})
    getSimpleMaterials().then((res) => {
      setMaterials(res.data as any[])
    }).catch(() => {})
  }, [])

  // ---------- fetch list ----------
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (statusFilter) params.status = statusFilter
      if (customerFilter) params.customer_id = customerFilter
      if (urgentFilter !== undefined) params.is_urgent = urgentFilter
      const res = await orderApi.getOrders(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, statusFilter, customerFilter, urgentFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetPageAndFetch = () => {
    setPage(1)
  }

  // ---------- handlers ----------
  const handleSearch = (value: string) => {
    setKeyword(value)
    resetPageAndFetch()
  }

  const handleStatusFilter = (value: string | undefined) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleCustomerFilter = (value: number | undefined) => {
    setCustomerFilter(value)
    setPage(1)
  }

  const handleUrgentFilter = (value: number | undefined) => {
    setUrgentFilter(value)
    setPage(1)
  }

  // ---------- create order ----------
  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ items: [{}] })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload: any = {
        ...values,
        delivery_date: values.delivery_date ? dayjs(values.delivery_date).format('YYYY-MM-DD') : null,
        is_urgent: values.is_urgent ? 1 : 0,
        items: (values.items || []).map((item: any) => ({
          material_id: item.material_id,
          material_code: item.material_code,
          material_name: item.material_name,
          brand: item.brand || null,
          model: item.model || null,
          quantity: item.quantity,
          unit: item.unit || '',
          unit_price: item.unit_price || 0,
          amount: (item.quantity || 0) * (item.unit_price || 0),
        })),
      }
      await orderApi.createOrder(payload)
      message.success('订单创建成功')
      setCreateOpen(false)
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('创建失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- material select handler ----------
  const onMaterialSelect = (index: number, materialId: number) => {
    const mat = materials.find((m: any) => m.id === materialId)
    if (!mat) return
    const items = form.getFieldValue('items') || []
    items[index] = {
      ...items[index],
      material_id: mat.id,
      material_code: mat.material_code,
      material_name: mat.name,
      brand: mat.brand || '',
      model: mat.model || '',
      unit: mat.unit || '',
    }
    form.setFieldsValue({ items })
  }

  // ---------- columns ----------
  const columns: ColumnsType<OrderListItem> = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      width: 150,
      render: (text: string, record) => (
        <span>
          {record.is_urgent === 1 && (
            <ThunderboltFilled style={{ color: '#ff4d4f', marginRight: 4 }} />
          )}
          {text}
        </span>
      ),
    },
    {
      title: '合同编号',
      dataIndex: 'contract_no',
      width: 140,
      render: (v: string | null) => v || '-',
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      width: 140,
    },
    {
      title: '销售',
      dataIndex: 'sales_name',
      width: 90,
    },
    {
      title: '项目负责人',
      dataIndex: 'project_manager_name',
      width: 110,
    },
    {
      title: '合同金额',
      dataIndex: 'total_amount',
      width: 110,
      align: 'right' as const,
      render: (v: number) => v != null ? `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: '货期',
      dataIndex: 'delivery_date',
      width: 110,
      render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {(OrderStatusLabels as any)[status] || status}
        </Tag>
      ),
    },
    {
      title: '明细数',
      dataIndex: 'item_count',
      width: 70,
      align: 'center' as const,
    },
    {
      title: '操作',
      width: 90,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/orders/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ]

  // ---------- compute total amount for create form ----------
  const formItems = Form.useWatch('items', form) || []
  const totalAmount = (formItems as any[]).reduce((sum: number, item: any) => {
    if (!item) return sum
    return sum + ((item.quantity || 0) * (item.unit_price || 0))
  }, 0)

  return (
    <div>
      {/* filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索订单编号/客户"
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 150 }}
            options={statusOptions}
            onChange={handleStatusFilter}
            value={statusFilter}
          />
          <Select
            placeholder="客户筛选"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            options={customers}
            onChange={handleCustomerFilter}
            value={customerFilter}
          />
          <Select
            placeholder="加急筛选"
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 1, label: '加急' },
              { value: 0, label: '非加急' },
            ]}
            onChange={handleUrgentFilter}
            value={urgentFilter}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建订单
        </Button>
      </div>

      {/* order table */}
      <Table<OrderListItem>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowClassName={(record) => (record.is_urgent === 1 ? 'urgent-order-row' : '')}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        scroll={{ x: 1200 }}
      />

      {/* create order modal */}
      <Modal
        title="新建订单"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={900}
        okText="提交"
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="customer_id" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
                <Select
                  placeholder="请选择客户"
                  showSearch
                  optionFilterProp="label"
                  options={customers}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="project_manager_id" label="项目负责人" rules={[{ required: true, message: '请选择项目负责人' }]}>
                <Select
                  placeholder="请选择项目负责人"
                  showSearch
                  optionFilterProp="label"
                  options={projectManagers}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="delivery_date" label="货期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="is_urgent" label="是否加急" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="factory_demand_desc" label="工厂需求描述">
            <Input.TextArea rows={2} placeholder="请输入工厂需求描述" />
          </Form.Item>

          <Divider orientation="left">备件明细</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 8 }}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      ) : null
                    }
                  >
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'material_id']}
                          label="物料"
                          rules={[{ required: true, message: '请选择物料' }]}
                        >
                          <Select
                            placeholder="选择物料"
                            showSearch
                            optionFilterProp="label"
                            options={materials.map((m: any) => ({ value: m.id, label: `${m.material_code} - ${m.name}` }))}
                            onChange={(val: number) => onMaterialSelect(index, val)}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'material_code']} label="物料编码">
                          <Input disabled />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'brand']} label="品牌">
                          <Input placeholder="品牌" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'model']} label="型号">
                          <Input placeholder="型号" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'unit']} label="单位">
                          <Input disabled />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label="数量"
                          rules={[{ required: true, message: '请输入数量' }]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unit_price']}
                          label="单价"
                          rules={[{ required: true, message: '请输入单价' }]}
                        >
                          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="单价" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item label="金额">
                          <InputNumber
                            value={(() => {
                              const item = (form.getFieldValue('items') || [])[index]
                              if (!item) return 0
                              return (item.quantity || 0) * (item.unit_price || 0)
                            })()}
                            disabled
                            style={{ width: '100%' }}
                            formatter={(v) => `¥${v}`}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加明细
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 12, fontSize: 16, fontWeight: 'bold' }}>
            合计金额：¥{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <Form.Item name="remark" label="备注" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .urgent-order-row {
          border-left: 3px solid #ff4d4f !important;
        }
        .urgent-order-row td {
          background: #fff7f7 !important;
        }
      `}</style>
    </div>
  )
}
