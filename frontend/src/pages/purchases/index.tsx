import { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Space, Select, Tag, message, Modal, Form,
  InputNumber, DatePicker, Descriptions,
} from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as purchaseApi from '@/api/purchaseOrders'
import * as supplierApi from '@/api/suppliers'
import { PurchaseStatus } from '@/api/types'
import type { PurchaseOrder } from '@/api/types'

// ---------- status label & color ----------
const PURCHASE_STATUS_LABELS: Record<string, string> = {
  [PurchaseStatus.PENDING]: '待采购',
  [PurchaseStatus.PURCHASING]: '采购中',
  [PurchaseStatus.ORDERED]: '已下单',
  [PurchaseStatus.ARRIVED]: '已到货',
  [PurchaseStatus.INSPECTED]: '已验收',
}

const PURCHASE_STATUS_COLORS: Record<string, string> = {
  [PurchaseStatus.PENDING]: 'orange',
  [PurchaseStatus.PURCHASING]: 'blue',
  [PurchaseStatus.ORDERED]: 'blue',
  [PurchaseStatus.ARRIVED]: 'green',
  [PurchaseStatus.INSPECTED]: 'green',
}

// ---------- status flow ----------
const STATUS_FLOW: Record<string, string> = {
  [PurchaseStatus.PENDING]: PurchaseStatus.PURCHASING,
  [PurchaseStatus.PURCHASING]: PurchaseStatus.ORDERED,
  [PurchaseStatus.ORDERED]: PurchaseStatus.ARRIVED,
}

const STATUS_FLOW_LABELS: Record<string, string> = {
  [PurchaseStatus.PENDING]: '开始采购',
  [PurchaseStatus.PURCHASING]: '确认下单',
  [PurchaseStatus.ORDERED]: '确认到货',
}

const purchaseStatusOptions = Object.entries(PURCHASE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export default function PurchaseListPage() {
  // list state
  const [data, setData] = useState<PurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [supplierFilter, setSupplierFilter] = useState<number | undefined>(undefined)

  // create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createForm] = Form.useForm()

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<PurchaseOrder | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // supplier options
  const [suppliers, setSuppliers] = useState<{ value: number; label: string }[]>([])

  // ---------- fetch suppliers ----------
  useEffect(() => {
    supplierApi.getSuppliers({ page: 1, page_size: 200 }).then((res) => {
      setSuppliers(res.data.items.map((s) => ({ value: s.id, label: s.name })))
    }).catch(() => {})
  }, [])

  // ---------- fetch list ----------
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (statusFilter) params.status = statusFilter
      if (supplierFilter) params.supplier_id = supplierFilter
      const res = await purchaseApi.getPurchases(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取采购单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, statusFilter, supplierFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- status advance ----------
  const handleAdvanceStatus = async (record: PurchaseOrder) => {
    const nextStatus = STATUS_FLOW[record.status]
    const label = STATUS_FLOW_LABELS[record.status]
    if (!nextStatus) return
    try {
      await purchaseApi.updatePurchaseStatus(record.id, { status: nextStatus })
      message.success(`${label}成功`)
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('操作失败')
      }
    }
  }

  // ---------- create ----------
  const openCreate = () => {
    createForm.resetFields()
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields()
      setSubmitting(true)
      const payload: any = {
        ...values,
        expected_delivery_date: values.expected_delivery_date
          ? dayjs(values.expected_delivery_date).format('YYYY-MM-DD')
          : null,
        total_amount: (values.quantity || 0) * (values.unit_price || 0),
      }
      await purchaseApi.createPurchase(payload)
      message.success('采购单创建成功')
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

  // ---------- detail ----------
  const openDetail = async (record: PurchaseOrder) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await purchaseApi.getPurchase(record.id)
      setDetailData(res.data)
    } catch {
      message.error('获取详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  // ---------- columns ----------
  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: '采购单号',
      dataIndex: 'purchase_no',
      width: 140,
      render: (text: string, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)} style={{ padding: 0 }}>
          {text}
        </Button>
      ),
    },
    {
      title: '关联订单',
      dataIndex: 'order_id',
      width: 100,
    },
    {
      title: '供应商',
      dataIndex: 'supplier_id',
      width: 120,
      render: (v: number) => {
        const s = suppliers.find((s) => s.value === v)
        return s ? s.label : v
      },
    },
    {
      title: '物料ID',
      dataIndex: 'material_id',
      width: 80,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
      align: 'right' as const,
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (v: number) => v != null ? `¥${v.toFixed(2)}` : '-',
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      width: 110,
      align: 'right' as const,
      render: (v: number) => v != null
        ? `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={PURCHASE_STATUS_COLORS[status] || 'default'}>
          {PURCHASE_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: '预交日期',
      dataIndex: 'expected_delivery_date',
      width: 110,
      render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => {
        const nextStatus = STATUS_FLOW[record.status]
        const label = STATUS_FLOW_LABELS[record.status]
        if (!nextStatus) return <span style={{ color: '#999' }}>-</span>
        return (
          <Button type="link" size="small" onClick={() => handleAdvanceStatus(record)}>
            {label}
          </Button>
        )
      },
    },
  ]

  return (
    <div>
      {/* filter bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 16,
        flexWrap: 'wrap', gap: 8,
      }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索采购单号"
            allowClear
            onSearch={(v) => { setKeyword(v); setPage(1) }}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 140 }}
            options={purchaseStatusOptions}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            value={statusFilter}
          />
          <Select
            placeholder="供应商筛选"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            options={suppliers}
            onChange={(v) => { setSupplierFilter(v); setPage(1) }}
            value={supplierFilter}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建采购单
        </Button>
      </div>

      {/* table */}
      <Table<PurchaseOrder>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
        scroll={{ x: 1100 }}
      />

      {/* create modal */}
      <Modal
        title="新建采购单"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={600}
        okText="提交"
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="order_id" label="关联订单ID" rules={[{ required: true, message: '请输入订单ID' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入订单ID" />
          </Form.Item>
          <Form.Item name="order_item_id" label="订单明细ID" rules={[{ required: true, message: '请输入订单明细ID' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入订单明细ID" />
          </Form.Item>
          <Form.Item name="supplier_id" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select
              placeholder="请选择供应商"
              showSearch
              optionFilterProp="label"
              options={suppliers}
            />
          </Form.Item>
          <Form.Item name="material_id" label="物料ID" rules={[{ required: true, message: '请输入物料ID' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="请输入物料ID" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
          </Form.Item>
          <Form.Item name="unit_price" label="单价" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="单价" />
          </Form.Item>
          <Form.Item name="expected_delivery_date" label="预计到货日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* detail modal */}
      <Modal
        title="采购单详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
        ) : detailData ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="采购单号">{detailData.purchase_no}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={PURCHASE_STATUS_COLORS[detailData.status] || 'default'}>
                {PURCHASE_STATUS_LABELS[detailData.status] || detailData.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="关联订单ID">{detailData.order_id}</Descriptions.Item>
            <Descriptions.Item label="供应商ID">{detailData.supplier_id}</Descriptions.Item>
            <Descriptions.Item label="物料ID">{detailData.material_id}</Descriptions.Item>
            <Descriptions.Item label="数量">{detailData.quantity}</Descriptions.Item>
            <Descriptions.Item label="单价">¥{(detailData.unit_price || 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="金额">
              ¥{(detailData.total_amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Descriptions.Item>
            <Descriptions.Item label="预计到货日期">
              {detailData.expected_delivery_date ? dayjs(detailData.expected_delivery_date).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="实际到货日期">
              {detailData.actual_delivery_date ? dayjs(detailData.actual_delivery_date).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {detailData.remark || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(detailData.updated_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>未找到数据</div>
        )}
      </Modal>
    </div>
  )
}
