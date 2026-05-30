import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Space, Input, Select, Modal, Form, InputNumber, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/api/request'
import type { Order, OrderItem, OrderStatus, PaginatedResponse, Customer, Part } from '@/api/types'

const statusConfig: Record<OrderStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  confirmed: { color: 'blue', label: '已确认' },
  in_procurement: { color: 'orange', label: '采购中' },
  in_shipping: { color: 'purple', label: '发货中' },
  delivered: { color: 'green', label: '已交货' },
  closed: { color: 'cyan', label: '已关闭' },
  cancelled: { color: 'red', label: '已取消' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>()
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [form] = Form.useForm()

  // Load all customers and parts for name resolution
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [allParts, setAllParts] = useState<Part[]>([])

  useEffect(() => {
    Promise.all([
      request.get<PaginatedResponse<Customer>>('/customers', { params: { page_size: 100 } }),
      request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
    ]).then(([cRes, pRes]) => {
      setAllCustomers(cRes.data.items)
      setAllParts(pRes.data.items)
    }).catch(() => {})
  }, [])

  const allCustomerMap = Object.fromEntries(allCustomers.map((c) => [c.id, c.name]))
  const allPartMap = Object.fromEntries(allParts.map((p) => [p.id, `${p.name} (${p.part_number})`]))

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 10 }
      if (statusFilter) params.status = statusFilter
      if (keyword) params.keyword = keyword
      const res = await request.get<PaginatedResponse<Order>>('/orders', { params })
      setOrders(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, keyword])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const openCreateModal = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        request.get<PaginatedResponse<Customer>>('/customers', { params: { page_size: 100 } }),
        request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
      ])
      setCustomers(cRes.data.items)
      setParts(pRes.data.items)
      form.resetFields()
      form.setFieldsValue({ items: [{ part_id: undefined, quantity: 1, unit_price: 0 }] })
      setModalOpen(true)
    } catch {
      message.error('加载数据失败')
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await request.post('/orders', values)
      message.success('订单创建成功')
      setModalOpen(false)
      fetchOrders()
    } catch {
      message.error('创建订单失败')
    }
  }

  const handleAction = async (id: number, action: string) => {
    try {
      await request.post(`/orders/${id}/${action}`)
      message.success('操作成功')
      fetchOrders()
    } catch {
      message.error('操作失败')
    }
  }

  const viewDetail = async (id: number) => {
    try {
      const res = await request.get<Order>(`/orders/${id}`)
      setDetailOrder(res.data)
      setDetailOpen(true)
    } catch {
      message.error('获取订单详情失败')
    }
  }

  const columns: ColumnsType<Order> = [
    { title: '订单编号', dataIndex: 'order_no', key: 'order_no', width: 160 },
    {
      title: '客户',
      dataIndex: 'customer_id',
      key: 'customer_id',
      width: 120,
      render: (id: number) => allCustomerMap[id] || id,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: OrderStatus) => {
        const cfg = statusConfig[status]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status
      },
    },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', width: 120, render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record.id)}>详情</Button>
          {record.status === 'draft' && (
            <Popconfirm title="确认此订单？" onConfirm={() => handleAction(record.id, 'confirm')}>
              <Button size="small" type="primary">确认</Button>
            </Popconfirm>
          )}
          {record.status === 'draft' && (
            <Popconfirm title="取消此订单？" onConfirm={() => handleAction(record.id, 'cancel')}>
              <Button size="small" danger>取消</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const detailColumns: ColumnsType<OrderItem> = [
    { title: '备件', dataIndex: 'part_id', key: 'part_id', render: (id: number) => allPartMap[id] || id },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '小计', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '备注', dataIndex: 'notes', key: 'notes', render: (v: string | null) => v || '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="订单状态"
          allowClear
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Input.Search
          placeholder="搜索订单号/备注"
          style={{ width: 200 }}
          allowClear
          onSearch={(v) => { setKeyword(v); setPage(1) }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建订单
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 10,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => setPage(p),
        }}
      />

      <Modal
        title="新建订单"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="customer_id" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择客户"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...rest} name={[name, 'part_id']} rules={[{ required: true, message: '选择备件' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="选择备件"
                        style={{ width: 180 }}
                        options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.part_number})` }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: '输入数量' }]}>
                      <InputNumber min={1} placeholder="数量" />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'unit_price']} rules={[{ required: true, message: '输入单价' }]}>
                      <InputNumber min={0} precision={2} placeholder="单价" />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button danger onClick={() => remove(name)}>删除</Button>
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ part_id: undefined, quantity: 1, unit_price: 0 })} block>
                  添加备件
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={`订单详情 - ${detailOrder?.order_no || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
      >
        {detailOrder && (
          <div>
            <p><strong>客户：</strong>{allCustomerMap[detailOrder.customer_id] || detailOrder.customer_id}</p>
            <p><strong>状态：</strong><Tag color={statusConfig[detailOrder.status]?.color}>{statusConfig[detailOrder.status]?.label}</Tag></p>
            <p><strong>总金额：</strong>¥{Number(detailOrder.total_amount).toFixed(2)}</p>
            <p><strong>备注：</strong>{detailOrder.notes || '无'}</p>
            <Table
              rowKey="id"
              columns={detailColumns}
              dataSource={detailOrder.items || []}
              pagination={false}
              size="small"
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
