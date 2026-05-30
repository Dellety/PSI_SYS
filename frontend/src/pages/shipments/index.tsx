import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Tag, Space, Select, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/api/request'
import type { Shipment, ShipmentItem, ShipmentStatus, PaginatedResponse, Procurement, Part } from '@/api/types'

const statusConfig: Record<ShipmentStatus, { color: string; label: string }> = {
  pending: { color: 'blue', label: '待发货' },
  shipped: { color: 'processing', label: '已发货' },
  in_transit: { color: 'purple', label: '运输中' },
  arrived: { color: 'green', label: '已到达' },
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<Shipment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [procurements, setProcurements] = useState<Procurement[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [form] = Form.useForm()

  // Load all parts for name resolution
  const [allParts, setAllParts] = useState<Part[]>([])
  useEffect(() => {
    request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } })
      .then((res) => setAllParts(res.data.items))
      .catch(() => {})
  }, [])
  const allPartMap = Object.fromEntries(allParts.map((p) => [p.id, `${p.name} (${p.part_number})`]))

  const fetchShipments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 10 }
      if (statusFilter) params.status = statusFilter
      const res = await request.get<PaginatedResponse<Shipment>>('/shipments', { params })
      setShipments(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取发货列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  const openCreateModal = async () => {
    try {
      const [pcRes, pRes] = await Promise.all([
        request.get<PaginatedResponse<Procurement>>('/procurements', { params: { page_size: 100 } }),
        request.get<PaginatedResponse<Part>>('/parts', { params: { page_size: 100 } }),
      ])
      setProcurements(pcRes.data.items)
      setParts(pRes.data.items)
      form.resetFields()
      form.setFieldsValue({ items: [{ part_id: undefined, quantity: 1 }] })
      setModalOpen(true)
    } catch {
      message.error('加载数据失败')
    }
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      await request.post('/shipments', values)
      message.success('发货单创建成功')
      setModalOpen(false)
      fetchShipments()
    } catch {
      message.error('创建发货单失败')
    }
  }

  const handleShip = async (id: number) => {
    try {
      await request.post(`/shipments/${id}/ship`)
      message.success('发货成功')
      fetchShipments()
    } catch {
      message.error('操作失败')
    }
  }

  const viewDetail = async (id: number) => {
    try {
      const res = await request.get<Shipment>(`/shipments/${id}`)
      setDetailRecord(res.data)
      setDetailOpen(true)
    } catch {
      message.error('获取发货详情失败')
    }
  }

  const columns: ColumnsType<Shipment> = [
    { title: '发货单号', dataIndex: 'shipment_no', key: 'shipment_no', width: 160 },
    {
      title: '采购单号',
      dataIndex: 'procurement_id',
      key: 'procurement_id',
      width: 120,
      render: (id: number) => `PROC-${id}`,
    },
    { title: '承运商', dataIndex: 'carrier', key: 'carrier', width: 120, render: (v: string | null) => v || '-' },
    { title: '物流单号', dataIndex: 'tracking_no', key: 'tracking_no', width: 160, render: (v: string | null) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ShipmentStatus) => {
        const cfg = statusConfig[status]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status
      },
    },
    { title: '发货时间', dataIndex: 'shipped_at', key: 'shipped_at', width: 180, render: (v: string | null) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record.id)}>详情</Button>
          {record.status === 'pending' && (
            <Popconfirm title="确认标记发货？" onConfirm={() => handleShip(record.id)}>
              <Button size="small" type="primary">标记发货</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const detailColumns: ColumnsType<ShipmentItem> = [
    { title: '备件', dataIndex: 'part_id', key: 'part_id', render: (id: number) => allPartMap[id] || id },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          placeholder="发货状态"
          allowClear
          style={{ width: 150 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新建发货
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={shipments}
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
        title="新建发货单"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="procurement_id" label="采购单" rules={[{ required: true, message: '请选择采购单' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择采购单"
              options={procurements.map((p) => ({ value: p.id, label: p.procurement_no }))}
            />
          </Form.Item>
          <Form.Item name="carrier" label="承运商">
            <Input placeholder="承运商名称" />
          </Form.Item>
          <Form.Item name="tracking_no" label="物流单号">
            <Input placeholder="物流单号" />
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
                        style={{ width: 200 }}
                        options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.part_number})` }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: '输入数量' }]}>
                      <InputNumber min={1} placeholder="数量" />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button danger onClick={() => remove(name)}>删除</Button>
                    )}
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ part_id: undefined, quantity: 1 })}
                  block
                >
                  添加发货项
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={`发货详情 - ${detailRecord?.shipment_no || ''}`}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
      >
        {detailRecord && (
          <div>
            <p><strong>采购单：</strong>{detailRecord.procurement_id}</p>
            <p><strong>承运商：</strong>{detailRecord.carrier || '无'}</p>
            <p><strong>物流单号：</strong>{detailRecord.tracking_no || '无'}</p>
            <p><strong>状态：</strong><Tag color={statusConfig[detailRecord.status]?.color}>{statusConfig[detailRecord.status]?.label}</Tag></p>
            <p><strong>发货时间：</strong>{detailRecord.shipped_at || '未发货'}</p>
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
