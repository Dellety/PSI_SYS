import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Table, Tag, Button, Space, Spin, message, Timeline, Modal, Form, Input, DatePicker, Popconfirm,
  InputNumber, Select,
} from 'antd'
import {
  ThunderboltFilled, ArrowLeftOutlined, PlusOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as orderApi from '@/api/contractOrders'
import * as purchaseApi from '@/api/purchaseOrders'
import * as inspectionApi from '@/api/inspectionRecords'
import * as shipmentApi from '@/api/shipmentRecords'
import * as receiptApi from '@/api/receiptRecords'
import * as returnApi from '@/api/returnExchanges'
import { OrderStatusLabels, type ContractOrderItem, type PurchaseOrder } from '@/api/types'
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

// ---------- purchase status labels ----------
const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: '待采购',
  purchasing: '采购中',
  ordered: '已下单',
  arrived: '已到货',
  inspected: '已验收',
}

const PURCHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  purchasing: 'blue',
  ordered: 'blue',
  arrived: 'green',
  inspected: 'green',
}

// ---------- return status labels ----------
const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_confirm: '待确认',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
}

const RETURN_STATUS_COLORS: Record<string, string> = {
  pending_confirm: 'orange',
  processing: 'blue',
  completed: 'green',
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

  // ---------- purchase / inspection / shipment / receipt / return sub-data ----------
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([])
  const [inspections, setInspections] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])

  // ---------- inspection modal ----------
  const [inspectOpen, setInspectOpen] = useState(false)
  const [inspectForm] = Form.useForm()
  const [inspectSaving, setInspectSaving] = useState(false)

  // ---------- shipment create modal ----------
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [shipmentForm] = Form.useForm()
  const [shipmentSaving, setShipmentSaving] = useState(false)

  // ---------- receipt modal ----------
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptForm] = Form.useForm()
  const [receiptSaving, setReceiptSaving] = useState(false)
  const [archiveSaving, setArchiveSaving] = useState<number | null>(null)

  // ---------- return modal ----------
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnForm] = Form.useForm()
  const [returnSaving, setReturnSaving] = useState(false)
  const [confirmReturnSaving, setConfirmReturnSaving] = useState<number | null>(null)
  const [completeReturnSaving, setCompleteReturnSaving] = useState<number | null>(null)

  // ---------- fetch order ----------
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

  // ---------- fetch sub-data ----------
  const fetchSubData = useCallback(async () => {
    if (!orderId) return
    try {
      const [pRes, iRes, sRes, rRes, retRes] = await Promise.allSettled([
        purchaseApi.getOrderPurchases(orderId),
        inspectionApi.getOrderInspections(orderId),
        shipmentApi.getOrderShipments(orderId),
        receiptApi.getOrderReceipts(orderId),
        returnApi.getOrderReturns(orderId),
      ])
      if (pRes.status === 'fulfilled') setPurchases(Array.isArray(pRes.value.data) ? pRes.value.data : (pRes.value.data as any).items || [])
      if (iRes.status === 'fulfilled') setInspections(Array.isArray(iRes.value.data) ? iRes.value.data : [])
      if (sRes.status === 'fulfilled') setShipments(Array.isArray(sRes.value.data) ? sRes.value.data : [])
      if (rRes.status === 'fulfilled') setReceipts(Array.isArray(rRes.value.data) ? rRes.value.data : [])
      if (retRes.status === 'fulfilled') setReturns(Array.isArray(retRes.value.data) ? retRes.value.data : (retRes.value.data as any).items || [])
    } catch {
      // silently fail for sub-data
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    fetchSubData()
  }, [fetchOrder, fetchSubData])

  // ---------- status change ----------
  const handleStatusChange = async (targetStatus: string) => {
    if (!orderId) return
    setStatusChanging(targetStatus)
    try {
      await orderApi.changeOrderStatus(orderId, targetStatus)
      message.success('状态更新成功')
      const [orderRes, actionsRes] = await Promise.all([
        orderApi.getOrder(orderId),
        orderApi.getOrderActions(orderId),
      ])
      setOrder(orderRes.data)
      setActions(actionsRes.data.actions || [])
      fetchSubData()
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

  // ---------- inspection ----------
  const openInspectModal = () => {
    inspectForm.resetFields()
    inspectForm.setFieldsValue({ inspection_result: 1 })
    setInspectOpen(true)
  }

  const handleInspection = async () => {
    try {
      const values = await inspectForm.validateFields()
      setInspectSaving(true)
      await inspectionApi.createInspection({
        ...values,
        order_id: orderId,
        inspection_date: values.inspection_date ? dayjs(values.inspection_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      })
      message.success('验收记录提交成功')
      setInspectOpen(false)
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('提交失败')
      }
    } finally {
      setInspectSaving(false)
    }
  }

  const handleConfirmInspection = async () => {
    try {
      await inspectionApi.confirmInspection(orderId)
      message.success('验收确认完成')
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('确认失败')
      }
    }
  }

  // ---------- shipment ----------
  const openShipmentModal = () => {
    shipmentForm.resetFields()
    shipmentForm.setFieldsValue({ shipment_date: dayjs() })
    setShipmentOpen(true)
  }

  const handleShipment = async () => {
    try {
      const values = await shipmentForm.validateFields()
      setShipmentSaving(true)
      await shipmentApi.createShipment({
        ...values,
        order_id: orderId,
        shipment_date: values.shipment_date ? dayjs(values.shipment_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      })
      message.success('发货单创建成功')
      setShipmentOpen(false)
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('创建失败')
      }
    } finally {
      setShipmentSaving(false)
    }
  }

  // ---------- receipt ----------
  const openReceiptModal = () => {
    receiptForm.resetFields()
    receiptForm.setFieldsValue({ receipt_date: dayjs(), receipt_status: 1 })
    setReceiptOpen(true)
  }

  const handleReceipt = async () => {
    try {
      const values = await receiptForm.validateFields()
      setReceiptSaving(true)
      await receiptApi.createReceipt({
        ...values,
        order_id: orderId,
        receipt_date: values.receipt_date ? dayjs(values.receipt_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      })
      message.success('签收记录提交成功')
      setReceiptOpen(false)
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('提交失败')
      }
    } finally {
      setReceiptSaving(false)
    }
  }

  const handleArchiveReceipt = async (receiptId: number) => {
    setArchiveSaving(receiptId)
    try {
      await receiptApi.archiveReceipt(receiptId, {})
      message.success('归档成功')
      fetchSubData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('归档失败')
      }
    } finally {
      setArchiveSaving(null)
    }
  }

  // ---------- return / exchange ----------
  const openReturnModal = () => {
    returnForm.resetFields()
    setReturnOpen(true)
  }

  const handleReturn = async () => {
    try {
      const values = await returnForm.validateFields()
      setReturnSaving(true)
      await returnApi.createReturn({
        ...values,
        order_id: orderId,
      })
      message.success('退换货申请提交成功')
      setReturnOpen(false)
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('提交失败')
      }
    } finally {
      setReturnSaving(false)
    }
  }

  const handleConfirmReturn = async (returnId: number) => {
    setConfirmReturnSaving(returnId)
    try {
      await returnApi.confirmReturn(returnId)
      message.success('确认成功')
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('确认失败')
      }
    } finally {
      setConfirmReturnSaving(null)
    }
  }

  const handleCompleteReturn = async (returnId: number) => {
    setCompleteReturnSaving(returnId)
    try {
      await returnApi.completeReturn(returnId)
      message.success('完成成功')
      fetchSubData()
      fetchOrder()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('完成失败')
      }
    } finally {
      setCompleteReturnSaving(null)
    }
  }

  // ---------- price visibility ----------
  const canSeePrices = user?.role === EmployeeRole.ADMIN || user?.role === EmployeeRole.SALES

  // ---------- determine which sections to show ----------
  const orderStatus = order?.status as string
  const showPurchaseSection = orderStatus && !['pending_confirm', 'pending_quote', 'pending_contract', 'pending_dispatch', 'cancelled'].includes(orderStatus)
  const showInspectionSection = ['pending_inspect', 'inspecting', 'pending_ship', 'shipped', 'pending_receipt', 'received', 'closed', 'return_exchange'].includes(orderStatus)
  const showShipmentSection = ['pending_ship', 'shipped', 'pending_receipt', 'received', 'closed', 'return_exchange'].includes(orderStatus)
  const showReceiptSection = ['pending_receipt', 'received', 'closed', 'return_exchange'].includes(orderStatus)
  const showReturnSection = ['received', 'return_exchange', 'closed'].includes(orderStatus)

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

  // ---------- purchase columns ----------
  const purchaseColumns = [
    { title: '采购单号', dataIndex: 'purchase_no', width: 130 },
    { title: '供应商ID', dataIndex: 'supplier_id', width: 90 },
    { title: '物料ID', dataIndex: 'material_id', width: 80 },
    { title: '数量', dataIndex: 'quantity', width: 70, align: 'right' as const },
    {
      title: '金额', dataIndex: 'total_amount', width: 110, align: 'right' as const,
      render: (v: number) => v != null ? `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v: string) => (
        <Tag color={PURCHASE_STATUS_COLORS[v] || 'default'}>{PURCHASE_STATUS_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: '预交日期', dataIndex: 'expected_delivery_date', width: 100,
      render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
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

      {/* ========== Purchase Section ========== */}
      {showPurchaseSection && (
        <Card title="采购记录" style={{ marginTop: 16 }} size="small">
          <Table
            rowKey="id"
            columns={purchaseColumns}
            dataSource={purchases}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
          />
        </Card>
      )}

      {/* ========== Inspection Section ========== */}
      {showInspectionSection && (
        <Card
          title="验收管理"
          style={{ marginTop: 16 }}
          size="small"
          extra={
            <Space>
              {['pending_inspect', 'inspecting'].includes(orderStatus) && (
                <>
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openInspectModal}>
                    验收
                  </Button>
                  <Popconfirm title="确认全部验收通过，推进到待发货？" onConfirm={handleConfirmInspection} okText="确认" cancelText="取消">
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                      验收完成
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          }
        >
          {inspections.length > 0 ? (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={inspections}
              columns={[
                { title: '采购单ID', dataIndex: 'purchase_order_id', width: 100 },
                { title: '验收日期', dataIndex: 'inspection_date', width: 110, render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
                { title: '实收数量', dataIndex: 'actual_quantity', width: 90 },
                {
                  title: '结果', dataIndex: 'inspection_result', width: 90,
                  render: (v: number) => v === 1 ? <Tag color="green">合格</Tag> : <Tag color="red">不合格</Tag>,
                },
                { title: '备注', dataIndex: 'remark', ellipsis: true },
              ]}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无验收记录</div>
          )}
        </Card>
      )}

      {/* ========== Shipment Section ========== */}
      {showShipmentSection && (
        <Card
          title="发货管理"
          style={{ marginTop: 16 }}
          size="small"
          extra={
            orderStatus === 'pending_ship' ? (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openShipmentModal}>
                创建发货单
              </Button>
            ) : null
          }
        >
          {shipments.length > 0 ? (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={shipments}
              columns={[
                { title: '发货单号', dataIndex: 'shipment_no', width: 130 },
                { title: '快递公司', dataIndex: 'express_company', width: 110 },
                { title: '快递单号', dataIndex: 'tracking_no', width: 150 },
                { title: '收件人', dataIndex: 'receiver_name', width: 90 },
                { title: '联系电话', dataIndex: 'receiver_phone', width: 120 },
                { title: '收货地址', dataIndex: 'shipping_address', width: 200, ellipsis: true },
                {
                  title: '发货日期', dataIndex: 'shipment_date', width: 100,
                  render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
                },
                {
                  title: '地址确认', dataIndex: 'address_confirmed_at', width: 90,
                  render: (v: string | null) => v
                    ? <Tag color="green">已确认</Tag>
                    : <Tag color="orange">待确认</Tag>,
                },
              ]}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无发货记录</div>
          )}
        </Card>
      )}

      {/* ========== Receipt Section ========== */}
      {showReceiptSection && (
        <Card
          title="签收管理"
          style={{ marginTop: 16 }}
          size="small"
          extra={
            orderStatus === 'pending_receipt' ? (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openReceiptModal}>
                签收
              </Button>
            ) : null
          }
        >
          {receipts.length > 0 ? (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={receipts}
              columns={[
                {
                  title: '签收日期', dataIndex: 'receipt_date', width: 110,
                  render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
                },
                {
                  title: '状态', dataIndex: 'receipt_status', width: 100,
                  render: (v: number) => v === 1 ? <Tag color="green">已签收</Tag> : <Tag color="red">有问题</Tag>,
                },
                {
                  title: '附件', dataIndex: 'receipt_attachment', width: 120,
                  render: (v: string | null) => v ? <a href={v} target="_blank" rel="noreferrer">查看附件</a> : '-',
                },
                {
                  title: '归档', dataIndex: 'archived_at', width: 100,
                  render: (v: string | null) => v ? <Tag color="green">已归档</Tag> : <Tag color="orange">未归档</Tag>,
                },
                {
                  title: '操作', width: 80,
                  render: (_: any, record: any) => (
                    !record.archived_at ? (
                      <Button
                        type="link"
                        size="small"
                        loading={archiveSaving === record.id}
                        onClick={() => handleArchiveReceipt(record.id)}
                      >
                        归档
                      </Button>
                    ) : null
                  ),
                },
              ]}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无签收记录</div>
          )}
        </Card>
      )}

      {/* ========== Return / Exchange Section ========== */}
      {showReturnSection && (
        <Card
          title="退换货管理"
          style={{ marginTop: 16 }}
          size="small"
          extra={
            ['received', 'return_exchange'].includes(orderStatus) && (
              <Button type="primary" size="small" danger icon={<PlusOutlined />} onClick={openReturnModal}>
                发起退换货
              </Button>
            )
          }
        >
          {returns.length > 0 ? (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={returns}
              columns={[
                { title: '退换单号', dataIndex: 'return_no', width: 130 },
                {
                  title: '类型', dataIndex: 'type', width: 80,
                  render: (v: number) => v === 1 ? <Tag>退货</Tag> : <Tag color="blue">换货</Tag>,
                },
                { title: '原因', dataIndex: 'reason', width: 200, ellipsis: true },
                {
                  title: '状态', dataIndex: 'status', width: 100,
                  render: (v: string) => (
                    <Tag color={RETURN_STATUS_COLORS[v] || 'default'}>
                      {RETURN_STATUS_LABELS[v] || v}
                    </Tag>
                  ),
                },
                {
                  title: '操作', width: 160,
                  render: (_: any, record: any) => (
                    <Space size="small">
                      {record.status === 'pending_confirm' && (
                        <Button
                          type="link"
                          size="small"
                          loading={confirmReturnSaving === record.id}
                          onClick={() => handleConfirmReturn(record.id)}
                        >
                          确认
                        </Button>
                      )}
                      {record.status === 'processing' && (
                        <Button
                          type="link"
                          size="small"
                          loading={completeReturnSaving === record.id}
                          onClick={() => handleCompleteReturn(record.id)}
                        >
                          完成
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无退换货记录</div>
          )}
        </Card>
      )}

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

      {/* ========== MODALS ========== */}

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

      {/* inspection modal */}
      <Modal
        title="验收操作"
        open={inspectOpen}
        onOk={handleInspection}
        onCancel={() => setInspectOpen(false)}
        confirmLoading={inspectSaving}
        destroyOnClose
        okText="提交"
      >
        <Form form={inspectForm} layout="vertical" preserve={false}>
          <Form.Item name="purchase_order_id" label="采购单" rules={[{ required: true, message: '请选择采购单' }]}>
            <Select
              placeholder="请选择采购单"
              options={purchases.map((p) => ({
                value: p.id,
                label: `${p.purchase_no} - ${PURCHASE_STATUS_LABELS[p.status] || p.status}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="actual_quantity" label="实收数量" rules={[{ required: true, message: '请输入实收数量' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="实收数量" />
          </Form.Item>
          <Form.Item name="inspection_result" label="验收结果" rules={[{ required: true, message: '请选择验收结果' }]}>
            <Select
              placeholder="请选择验收结果"
              options={[
                { value: 1, label: '合格' },
                { value: 0, label: '不合格' },
              ]}
            />
          </Form.Item>
          <Form.Item name="inspection_date" label="验收日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* shipment create modal */}
      <Modal
        title="创建发货单"
        open={shipmentOpen}
        onOk={handleShipment}
        onCancel={() => setShipmentOpen(false)}
        confirmLoading={shipmentSaving}
        destroyOnClose
        width={600}
        okText="提交"
      >
        <Form form={shipmentForm} layout="vertical" preserve={false}>
          <Form.Item name="express_company" label="快递公司" rules={[{ required: true, message: '请输入快递公司' }]}>
            <Input placeholder="请输入快递公司" />
          </Form.Item>
          <Form.Item name="tracking_no" label="快递单号" rules={[{ required: true, message: '请输入快递单号' }]}>
            <Input placeholder="请输入快递单号" />
          </Form.Item>
          <Form.Item name="receiver_name" label="收件人" rules={[{ required: true, message: '请输入收件人' }]}>
            <Input placeholder="请输入收件人" />
          </Form.Item>
          <Form.Item name="receiver_phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="shipping_address" label="收货地址" rules={[{ required: true, message: '请输入收货地址' }]}>
            <Input.TextArea rows={2} placeholder="请输入收货地址" />
          </Form.Item>
          <Form.Item name="shipment_date" label="发货日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* receipt modal */}
      <Modal
        title="签收操作"
        open={receiptOpen}
        onOk={handleReceipt}
        onCancel={() => setReceiptOpen(false)}
        confirmLoading={receiptSaving}
        destroyOnClose
        okText="提交"
      >
        <Form form={receiptForm} layout="vertical" preserve={false}>
          <Form.Item name="shipment_id" label="发货单" rules={[{ required: true, message: '请选择发货单' }]}>
            <Select
              placeholder="请选择发货单"
              options={shipments.map((s) => ({
                value: s.id,
                label: `${s.shipment_no} - ${s.express_company}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="receipt_date" label="签收日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="receipt_status" label="签收状态" rules={[{ required: true, message: '请选择签收状态' }]}>
            <Select
              placeholder="请选择签收状态"
              options={[
                { value: 1, label: '已签收' },
                { value: 0, label: '有问题' },
              ]}
            />
          </Form.Item>
          <Form.Item name="receipt_attachment" label="签收单附件链接">
            <Input placeholder="请输入签收单附件链接" />
          </Form.Item>
        </Form>
      </Modal>

      {/* return / exchange modal */}
      <Modal
        title="发起退换货"
        open={returnOpen}
        onOk={handleReturn}
        onCancel={() => setReturnOpen(false)}
        confirmLoading={returnSaving}
        destroyOnClose
        okText="提交"
      >
        <Form form={returnForm} layout="vertical" preserve={false}>
          <Form.Item name="order_item_id" label="订单明细" rules={[{ required: true, message: '请选择订单明细' }]}>
            <Select
              placeholder="请选择订单明细"
              options={(order.items || []).map((item: any) => ({
                value: item.id,
                label: `${item.material_code} - ${item.material_name} (x${item.quantity})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              placeholder="请选择类型"
              options={[
                { value: 1, label: '退货' },
                { value: 2, label: '换货' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}>
            <Input.TextArea rows={3} placeholder="请输入退换货原因" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
