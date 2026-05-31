import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Table, Tag, Button, Space, Spin, message, Timeline, Modal, Form, Input, DatePicker, Popconfirm,
} from 'antd'
import { ThunderboltFilled, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import * as orderApi from '@/api/contractOrders'
import { OrderStatusLabels, type ContractOrderItem } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { EmployeeRole } from '@/api/types'

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

// status flow for timeline visualization
const STATUS_FLOW = [
  'pending_confirm',
  'pending_quote',
  'pending_contract',
  'pending_dispatch',
  'pending_purchase',
  'purchasing',
  'pending_inspect',
  'inspecting',
  'pending_ship',
  'shipped',
  'pending_receipt',
  'received',
  'closed',
]

const ACTION_BUTTON_COLORS: Record<string, 'primary' | 'default' | 'dashed' | 'link' | 'text'> = {
  pending_confirm: 'primary',
  pending_quote: 'primary',
  pending_contract: 'primary',
  pending_dispatch: 'primary',
  pending_purchase: 'primary',
  purchasing: 'default',
  pending_inspect: 'primary',
  inspecting: 'default',
  pending_ship: 'primary',
  shipped: 'default',
  pending_receipt: 'default',
  received: 'default',
  closed: 'default',
  return_exchange: 'default',
  cancelled: 'default',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const orderId = Number(id)

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<{ status: string; label: string }[]>([])
  const [statusChanging, setStatusChanging] = useState<string | null>(null)

  // contract edit modal
  const [contractOpen, setContractOpen] = useState(false)
  const [contractForm] = Form.useForm()
  const [contractSaving, setContractSaving] = useState(false)

  // close order
  const [closing, setClosing] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [orderRes, actionsRes] = await Promise.all([
        orderApi.getOrder(orderId),
        orderApi.getOrderActions(orderId),
      ])
      setOrder(orderRes.data)
      setActions(actionsRes.data.actions || [])
    } catch {
      message.error('获取订单详情失败')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // ---------- status change ----------
  const handleStatusChange = async (targetStatus: string) => {
    if (!orderId) return
    setStatusChanging(targetStatus)
    try {
      await orderApi.changeOrderStatus(orderId, targetStatus)
      message.success('状态更新成功')
      // refresh order and actions
      const [orderRes, actionsRes] = await Promise.all([
        orderApi.getOrder(orderId),
        orderApi.getOrderActions(orderId),
      ])
      setOrder(orderRes.data)
      setActions(actionsRes.data.actions || [])
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('状态更新失败')
      }
    } finally {
      setStatusChanging(null)
    }
  }

  // ---------- contract info ----------
  const openContractEdit = () => {
    contractForm.setFieldsValue({
      contract_no: order?.contract_no || '',
      sign_date: order?.sign_date ? dayjs(order.sign_date) : null,
      contract_attachment: order?.contract_attachment || '',
    })
    setContractOpen(true)
  }

  const handleContractSave = async () => {
    try {
      const values = await contractForm.validateFields()
      setContractSaving(true)
      const payload: any = {
        ...values,
        sign_date: values.sign_date ? dayjs(values.sign_date).format('YYYY-MM-DD') : null,
      }
      await orderApi.updateContractInfo(orderId, payload)
      message.success('合同信息更新成功')
      setContractOpen(false)
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('更新失败')
      }
    } finally {
      setContractSaving(false)
    }
  }

  // ---------- close order ----------
  const handleClose = async () => {
    if (!orderId) return
    setClosing(true)
    try {
      await orderApi.closeOrder(orderId)
      message.success('订单已关闭')
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('关闭订单失败')
      }
    } finally {
      setClosing(false)
    }
  }

  // ---------- price visibility ----------
  const canSeePrices = user?.role === EmployeeRole.ADMIN || user?.role === EmployeeRole.SALES

  // ---------- item columns ----------
  const itemColumns = [
    { title: '物料编码', dataIndex: 'material_code', width: 120 },
    { title: '物料名称', dataIndex: 'material_name', width: 140 },
    { title: '品牌', dataIndex: 'brand', width: 100, render: (v: string | null) => v || '-' },
    { title: '型号', dataIndex: 'model', width: 100, render: (v: string | null) => v || '-' },
    { title: '数量', dataIndex: 'quantity', width: 80, align: 'right' as const },
    { title: '单位', dataIndex: 'unit', width: 60, align: 'center' as const },
    ...(canSeePrices
      ? [
          { title: '单价', dataIndex: 'unit_price', width: 100, align: 'right' as const, render: (v: number) => `¥${v.toFixed(2)}` },
          { title: '金额', dataIndex: 'amount', width: 110, align: 'right' as const, render: (v: number) => `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        ]
      : []),
    { title: '发货状态', dataIndex: 'delivery_status', width: 100 },
  ]

  // ---------- timeline ----------
  const currentStatusIdx = order ? STATUS_FLOW.indexOf(order.status) : -1

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p>订单不存在</p>
        <Button onClick={() => navigate('/orders')}>返回列表</Button>
      </div>
    )
  }

  return (
    <div>
      {/* back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/orders')}
      >
        返回列表
      </Button>

      {/* basic info card */}
      <Card
        title={
          <span>
            订单 {order.order_no}
            {order.is_urgent === 1 && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                <ThunderboltFilled /> 加急
              </Tag>
            )}
            <Tag color={STATUS_COLORS[order.status] || 'default'} style={{ marginLeft: 8 }}>
              {(OrderStatusLabels as any)[order.status] || order.status}
            </Tag>
          </span>
        }
        extra={
          <Space wrap>
            {actions.map((action) => (
              <Popconfirm
                key={action.status}
                title={`确认执行「${action.label}」？`}
                onConfirm={() => handleStatusChange(action.status)}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  type={ACTION_BUTTON_COLORS[action.status] || 'default'}
                  loading={statusChanging === action.status}
                >
                  {action.label}
                </Button>
              </Popconfirm>
            ))}
            {order.status === 'received' && (
              <Popconfirm title="确认关闭此订单？" onConfirm={handleClose} okText="确认" cancelText="取消">
                <Button danger loading={closing}>关闭订单</Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Descriptions column={4} bordered size="small">
          <Descriptions.Item label="客户名称">{order.customer_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="销售">{order.sales_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="项目负责人">{order.project_manager_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="货期">
            {order.delivery_date ? dayjs(order.delivery_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="合同金额">
            {canSeePrices ? `¥${(order.total_amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '***'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="工厂需求描述" span={2}>
            {order.factory_demand_desc || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* items table */}
      <Card title="备件明细" style={{ marginTop: 16 }} size="small">
        <Table<ContractOrderItem>
          rowKey="id"
          columns={itemColumns}
          dataSource={order.items || []}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
        />
      </Card>

      {/* status timeline */}
      <Card title="订单进度" style={{ marginTop: 16 }} size="small">
        <Timeline
          mode="left"
          items={STATUS_FLOW.map((status, idx) => ({
            color: idx < currentStatusIdx ? 'green' : idx === currentStatusIdx ? 'blue' : 'gray',
            children: (
              <span style={{ fontWeight: idx === currentStatusIdx ? 'bold' : 'normal' }}>
                {(OrderStatusLabels as any)[status] || status}
              </span>
            ),
          }))}
        />
      </Card>

      {/* contract info */}
      <Card
        title="合同信息"
        style={{ marginTop: 16 }}
        size="small"
        extra={
          ['pending_contract', 'pending_confirm', 'pending_quote'].includes(order.status) ? null : (
            <Button type="link" size="small" onClick={openContractEdit}>
              编辑
            </Button>
          )
        }
      >
        <Descriptions column={3} size="small">
          <Descriptions.Item label="合同编号">{order.contract_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="签订日期">
            {order.sign_date ? dayjs(order.sign_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="合同附件">
            {order.contract_attachment ? (
              <a href={order.contract_attachment} target="_blank" rel="noreferrer">查看附件</a>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* remark */}
      {order.remark && (
        <Card title="备注" style={{ marginTop: 16 }} size="small">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.remark}</p>
        </Card>
      )}

      {/* contract edit modal */}
      <Modal
        title="编辑合同信息"
        open={contractOpen}
        onOk={handleContractSave}
        onCancel={() => setContractOpen(false)}
        confirmLoading={contractSaving}
        destroyOnClose
      >
        <Form form={contractForm} layout="vertical" preserve={false}>
          <Form.Item name="contract_no" label="合同编号">
            <Input placeholder="请输入合同编号" />
          </Form.Item>
          <Form.Item name="sign_date" label="签订日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="contract_attachment" label="合同附件链接">
            <Input placeholder="请输入合同附件链接" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
