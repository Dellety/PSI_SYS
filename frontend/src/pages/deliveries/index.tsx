import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Space, Select, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/api/request'
import type { Delivery, DeliveryItem, DeliveryStatus, PaginatedResponse, Shipment, ItemCondition, Part } from '@/api/types'

const statusConfig: Record<DeliveryStatus, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待交货' },
  delivered: { color: 'cyan', label: '已交货' },
  accepted: { color: 'green', label: '已签收' },
  rejected: { color: 'red', label: '已拒收' },
}

const conditionLabels: Record<ItemCondition, string> = {
  normal: '正常',
  damaged: '损坏',
  short: '短缺',
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [detailRecord, setDetailRecord] = useState<Delivery | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [form] = Form.useForm()
  const [confirmForm] = Form.useForm()

  // Load all parts for name resolution
  const [allParts, setAllParts] = useState<Part[]>([])
  useEffect(() => {
    request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } })
      .then((res) => setAllParts(res.data.items))
      .catch(() => {})
  }, [])
  const allPartMap = Object.fromEntries(allParts.map((p) => [p.id, `${p.name} (${p.part_number})`]))

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 10 }
      if (statusFilter) params.status = statusFilter
      const res = await request.get<PaginatedResponse<Delivery>>('/deliveries', { params })
      setDeliveries(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取交货列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  const openCreateModal = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        request.get<PaginatedResponse<Shipment>>('/shipments', { params: { page_size: 100 } }),
        request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
      ])
      setShipments(sRes.data.items)
      setParts(pRes.data.items)
      form.resetFields()
      form.setFieldsValue({ items: [{ part_id: undefined, quantity: 1, condition: 'normal' }] })
      setModalOpen(true)
    } catch {
      message.error('加载数据失败')
    }
  }

  const handleSelectShipment = async (shipmentId: number) => {
    try {
      const res = await request.get<Shipment>(`/shipments/${shipmentId}`)
      const items = (res.data.items || []).map((item) => ({
        part_id: item.part_id,
        quantity: item.quantity,
        condition: 'normal' as ItemCondition,
      }))
      form.setFieldsValue({
        items: items.length > 0 ? items : [{ part_id: undefined, quantity: 1, condition: 'normal' }],
      })
    } catch {
      message.error('获取发货单详情失败')
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await request.post('/deliveries', values)
      message.success('交货单创建成功')
      setModalOpen(false)
      fetchDeliveries()
    } catch {
      message.error('创建交货单失败')
    }
  }

  const openConfirmModal = (id: number) => {
    setConfirmId(id)
    confirmForm.resetFields()
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirmId) return
    try {
      const values = await confirmForm.validateFields()
      await request.post(`/deliveries/${confirmId}/confirm`, values)
      message.success('交货确认成功')
      setConfirmOpen(false)
      fetchDeliveries()
    } catch {
      message.error('操作失败')
    }
  }

  const handleAccept = async (id: number) => {
    try {
      await request.post(`/deliveries/${id}/accept`)
      message.success('签收成功')
      fetchDeliveries()
    } catch {
      message.error('签收失败')
    }
  }

  const viewDetail = async (id: number) => {
    try {
      const res = await request.get<Delivery>(`/deliveries/${id}`)
      setDetailRecord(res.data)
      setDetailOpen(true)
    } catch {
      message.error('获取交货详情失败')
    }
  }

  const columns: ColumnsType<Delivery> = [
    { title: '交货单号', dataIndex: 'delivery_no', key: 'delivery_no', width: 160 },
    { title: '发货单号', dataIndex: 'shipment_id', key: 'shipment_id', width: 120 },
    { title: '收货人', dataIndex: 'receiver_name', key: 'receiver_name', width: 120, render: (v: string | null) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: DeliveryStatus) => {
        const cfg = statusConfig[status]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status
      },
    },
    { title: '交货时间', dataIndex: 'delivered_at', key: 'delivered_at', width: 180, render: (v: string | null) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record.id)}>详情</Button>
          {record.status === 'pending' && (
            <Button size="small" type="primary" onClick={() => openConfirmModal(record.id)}>
              确认交货
            </Button>
          )}
          {record.status === 'delivered' && (
            <Popconfirm title="确认签收？" onConfirm={() => handleAccept(record.id)}>
              <Button size="small" type="primary">签收</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const detailColumns: ColumnsType<DeliveryItem> = [
    { title: '备件', dataIndex: 'part_id', key: 'part_id', render: (id: number) => allPartMap[id] || id },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '状况',
      dataIndex: 'condition',
      key: 'condition',
      render: (v: ItemCondition) => conditionLabels[v] || v,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="交货状态"
          allowClear
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建交货
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={deliveries}
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
        title="新建交货单"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="shipment_id" label="发货单" rules={[{ required: true, message: '请选择发货单' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择发货单"
              options={shipments.map((s) => ({ value: s.id, label: s.shipment_no }))}
              onChange={handleSelectShipment}
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
                    <Form.Item {...rest} name={[name, 'condition']} rules={[{ required: true, message: '选择状况' }]}>
                      <Select
                        placeholder="状况"
                        style={{ width: 100 }}
                        options={Object.entries(conditionLabels).map(([k, v]) => ({ value: k, label: v }))}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button danger onClick={() => remove(name)}>删除</Button>
                    )}
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ part_id: undefined, quantity: 1, condition: 'normal' })}
                  block
                >
                  添加交货项
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title="确认交货"
        open={confirmOpen}
        onOk={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        width={480}
        destroyOnClose
      >
        <Form form={confirmForm} layout="vertical">
          <Form.Item name="receiver_name" label="收货人" rules={[{ required: true, message: '请输入收货人' }]}>
            <Input placeholder="收货人姓名" />
          </Form.Item>
          <Form.Item name="receiver_phone" label="收货人电话" rules={[{ required: true, message: '请输入收货人电话' }]}>
            <Input placeholder="收货人电话" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`交货详情 - ${detailRecord?.delivery_no || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
      >
        {detailRecord && (
          <div>
            <p><strong>收货人：</strong>{detailRecord.receiver_name || '无'}</p>
            <p><strong>收货人电话：</strong>{detailRecord.receiver_phone || '无'}</p>
            <p><strong>状态：</strong><Tag color={statusConfig[detailRecord.status]?.color}>{statusConfig[detailRecord.status]?.label}</Tag></p>
            <p><strong>交货时间：</strong>{detailRecord.delivered_at || '未交货'}</p>
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
