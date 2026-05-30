import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Space, Input, Select, Modal, Form, InputNumber, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/api/request'
import type { Procurement, ProcurementItem, ProcurementStatus, PaginatedResponse, Supplier, Part, Order } from '@/api/types'

const statusConfig: Record<ProcurementStatus, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待报价' },
  quoted: { color: 'cyan', label: '已报价' },
  confirmed: { color: 'processing', label: '已确认' },
  ordered: { color: 'orange', label: '已下单' },
  received: { color: 'green', label: '已收货' },
}

export default function ProcurementsPage() {
  const [procurements, setProcurements] = useState<Procurement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ProcurementStatus | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<Procurement | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [fromOrderOpen, setFromOrderOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([])
  const [form] = Form.useForm()
  const [fromOrderForm] = Form.useForm()

  // Load all suppliers and parts for name resolution
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([])
  const [allParts, setAllParts] = useState<Part[]>([])

  useEffect(() => {
    Promise.all([
      request.get<PaginatedResponse<Supplier>>('/suppliers', { params: { page_size: 100 } }),
      request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
    ]).then(([sRes, pRes]) => {
      setAllSuppliers(sRes.data.items)
      setAllParts(pRes.data.items)
    }).catch(() => {})
  }, [])

  const allSupplierMap = Object.fromEntries(allSuppliers.map((s) => [s.id, s.name]))
  const allPartMap = Object.fromEntries(allParts.map((p) => [p.id, `${p.name} (${p.part_number})`]))

  const fetchProcurements = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 10 }
      if (statusFilter) params.status = statusFilter
      const res = await request.get<PaginatedResponse<Procurement>>('/procurements', { params })
      setProcurements(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取采购列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchProcurements()
  }, [fetchProcurements])

  const loadBaseData = async () => {
    const [sRes, pRes] = await Promise.all([
      request.get<PaginatedResponse<Supplier>>('/suppliers', { params: { page_size: 100 } }),
      request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
    ])
    setSuppliers(sRes.data.items)
    setParts(pRes.data.items)
  }

  const openCreateModal = async () => {
    try {
      await loadBaseData()
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
      await request.post('/procurements', values)
      message.success('采购单创建成功')
      setModalOpen(false)
      fetchProcurements()
    } catch {
      message.error('创建采购单失败')
    }
  }

  const openFromOrderModal = async () => {
    try {
      await loadBaseData()
      const res = await request.get<PaginatedResponse<Order>>('/orders', { params: { status: 'confirmed', page_size: 100 } })
      setConfirmedOrders(res.data.items)
      fromOrderForm.resetFields()
      setFromOrderOpen(true)
    } catch {
      message.error('加载数据失败')
    }
  }

  const handleSelectOrder = async (orderId: number) => {
    try {
      const res = await request.get<Order>(`/orders/${orderId}`)
      const items = (res.data.items || []).map((item) => ({
        part_id: item.part_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
      fromOrderForm.setFieldsValue({
        order_id: orderId,
        items: items.length > 0 ? items : [{ part_id: undefined, quantity: 1, unit_price: 0 }],
      })
    } catch {
      message.error('获取订单详情失败')
    }
  }

  const handleFromOrderCreate = async () => {
    try {
      const values = await fromOrderForm.validateFields()
      // Backend expects: POST /procurements/from-order/{order_id}?supplier_id=xxx
      const orderId = values.order_id
      const supplierId = values.supplier_id
      await request.post(`/procurements/from-order/${orderId}`, null, {
        params: { supplier_id: supplierId },
      })
      message.success('从订单生成采购单成功')
      setFromOrderOpen(false)
      fetchProcurements()
    } catch {
      message.error('从订单生成采购单失败')
    }
  }

  const handleConfirm = async (id: number) => {
    try {
      await request.post(`/procurements/${id}/confirm`)
      message.success('采购确认成功')
      fetchProcurements()
    } catch {
      message.error('操作失败')
    }
  }

  const viewDetail = async (id: number) => {
    try {
      const res = await request.get<Procurement>(`/procurements/${id}`)
      setDetailRecord(res.data)
      setDetailOpen(true)
    } catch {
      message.error('获取采购详情失败')
    }
  }

  const columns: ColumnsType<Procurement> = [
    { title: '采购单号', dataIndex: 'procurement_no', key: 'procurement_no', width: 160 },
    {
      title: '关联订单',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 120,
      render: (id: number | null) => id || '-',
    },
    {
      title: '供应商',
      dataIndex: 'supplier_id',
      key: 'supplier_id',
      width: 120,
      render: (id: number) => allSupplierMap[id] || id,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ProcurementStatus) => {
        const cfg = statusConfig[status]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status
      },
    },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', width: 120, render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record.id)}>详情</Button>
          {record.status === 'pending' && (
            <Popconfirm title="确认此采购？" onConfirm={() => handleConfirm(record.id)}>
              <Button size="small" type="primary">确认采购</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const detailColumns: ColumnsType<ProcurementItem> = [
    { title: '备件', dataIndex: 'part_id', key: 'part_id', render: (id: number) => allPartMap[id] || id },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '小计', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: '备注', dataIndex: 'notes', key: 'notes', render: (v: string | null) => v || '-' },
  ]

  const renderItemsForm = () => (
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
                  style={{ width: 200 }}
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
          <Button
            type="dashed"
            onClick={() => add({ part_id: undefined, quantity: 1, unit_price: 0 })}
            block
          >
            添加采购项
          </Button>
        </>
      )}
    </Form.List>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="采购状态"
          allowClear
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建采购
        </Button>
        <Button onClick={openFromOrderModal}>
          从订单生成
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={procurements}
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
        title="新建采购单"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="supplier_id" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择供应商"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="order_id" label="关联订单号">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="可选，选择关联订单"
              options={confirmedOrders.map((o) => ({ value: o.id, label: o.order_no }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          {renderItemsForm()}
        </Form>
      </Modal>

      <Modal
        title="从订单生成采购单"
        open={fromOrderOpen}
        onOk={handleFromOrderCreate}
        onCancel={() => setFromOrderOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={fromOrderForm} layout="vertical">
          <Form.Item name="order_id" label="选择订单" rules={[{ required: true, message: '请选择订单' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择已确认的订单"
              options={confirmedOrders.map((o) => ({ value: o.id, label: o.order_no }))}
              onChange={handleSelectOrder}
            />
          </Form.Item>
          <Form.Item name="supplier_id" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择供应商"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          {renderItemsForm()}
        </Form>
      </Modal>

      <Modal
        title={`采购详情 - ${detailRecord?.procurement_no || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
      >
        {detailRecord && (
          <div>
            <p><strong>供应商：</strong>{allSupplierMap[detailRecord.supplier_id] || detailRecord.supplier_id}</p>
            <p><strong>状态：</strong><Tag color={statusConfig[detailRecord.status]?.color}>{statusConfig[detailRecord.status]?.label}</Tag></p>
            <p><strong>总金额：</strong>¥{Number(detailRecord.total_amount).toFixed(2)}</p>
            <p><strong>备注：</strong>{detailRecord.notes || '无'}</p>
            <Table
              rowKey="id"
              columns={detailColumns}
              dataSource={detailRecord.items || []}
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
