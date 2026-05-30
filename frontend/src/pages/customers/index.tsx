import { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, Select, Tag, message,
  Drawer, Descriptions, Tabs, Popconfirm, Row, Col, Tooltip,
} from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getCustomers, getCustomer, createCustomer, updateCustomer,
  toggleCustomerStatus, addCustomerAddress, updateCustomerAddress,
  deleteCustomerAddress, addCustomerInvoice, updateCustomerInvoice,
} from '@/api/customers'
import type { Customer, CustomerAddress, CustomerInvoice } from '@/api/types'

const customerLevelMap: Record<number, { label: string; color: string }> = {
  1: { label: 'A', color: 'red' },
  2: { label: 'B', color: 'blue' },
  3: { label: 'C', color: 'default' },
}

const customerLevelOptions = [
  { value: 1, label: 'A级' },
  { value: 2, label: 'B级' },
  { value: 3, label: 'C级' },
]

const addressTypeMap: Record<number, string> = {
  1: '工厂',
  2: '客户',
  3: '其他',
}

const addressTypeOptions = [
  { value: 1, label: '工厂' },
  { value: 2, label: '客户' },
  { value: 3, label: '其他' },
]

export default function CustomerPage() {
  const [data, setData] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // Detail Drawer
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<Customer | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Address sub-modal
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
  const [addressForm] = Form.useForm()

  // Invoice sub-modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<CustomerInvoice | null>(null)
  const [invoiceForm] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      const res = await getCustomers(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取客户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Customer) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      contact_person: record.contact_person,
      contact_phone: record.contact_phone,
      contact_email: record.contact_email,
      customer_level: record.customer_level,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editing) {
        await updateCustomer(editing.id, values)
        message.success('更新成功')
      } else {
        await createCustomer(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (err?.errorFields) {
        // form validation error
      } else {
        message.error('操作失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (record: Customer) => {
    try {
      await toggleCustomerStatus(record.id)
      message.success(record.status === 1 ? '已停用' : '已启用')
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const openDetail = async (record: Customer) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await getCustomer(record.id)
      setDetailData(res.data)
    } catch {
      message.error('获取客户详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshDetail = async () => {
    if (!detailData) return
    try {
      const res = await getCustomer(detailData.id)
      setDetailData(res.data)
    } catch {
      // silent
    }
  }

  // ---- Address management ----
  const openAddAddress = () => {
    setEditingAddress(null)
    addressForm.resetFields()
    setAddressModalOpen(true)
  }

  const openEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr)
    addressForm.setFieldsValue({
      address_type: addr.address_type,
      receiver_name: addr.receiver_name,
      receiver_phone: addr.receiver_phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail_address: addr.detail_address,
      is_default: addr.is_default,
    })
    setAddressModalOpen(true)
  }

  const handleAddressSubmit = async () => {
    if (!detailData) return
    try {
      const values = await addressForm.validateFields()
      if (editingAddress) {
        await updateCustomerAddress(detailData.id, editingAddress.id, values)
        message.success('地址更新成功')
      } else {
        await addCustomerAddress(detailData.id, values)
        message.success('地址添加成功')
      }
      setAddressModalOpen(false)
      refreshDetail()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('操作失败')
      }
    }
  }

  const handleDeleteAddress = async (addr: CustomerAddress) => {
    if (!detailData) return
    try {
      await deleteCustomerAddress(detailData.id, addr.id)
      message.success('地址已删除')
      refreshDetail()
    } catch {
      message.error('删除失败')
    }
  }

  // ---- Invoice management ----
  const openAddInvoice = () => {
    setEditingInvoice(null)
    invoiceForm.resetFields()
    setInvoiceModalOpen(true)
  }

  const openEditInvoice = (inv: CustomerInvoice) => {
    setEditingInvoice(inv)
    invoiceForm.setFieldsValue({
      invoice_title: inv.invoice_title,
      tax_no: inv.tax_no,
      bank_name: inv.bank_name,
      bank_account: inv.bank_account,
      invoice_address: inv.invoice_address,
      invoice_phone: inv.invoice_phone,
    })
    setInvoiceModalOpen(true)
  }

  const handleInvoiceSubmit = async () => {
    if (!detailData) return
    try {
      const values = await invoiceForm.validateFields()
      if (editingInvoice) {
        await updateCustomerInvoice(detailData.id, editingInvoice.id, values)
        message.success('开票信息更新成功')
      } else {
        await addCustomerInvoice(detailData.id, values)
        message.success('开票信息添加成功')
      }
      setInvoiceModalOpen(false)
      refreshDetail()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('操作失败')
      }
    }
  }

  const columns: ColumnsType<Customer> = [
    { title: '客户编码', dataIndex: 'customer_code', width: 130 },
    { title: '名称', dataIndex: 'name', width: 140, ellipsis: true },
    { title: '对接人', dataIndex: 'contact_person', width: 100 },
    { title: '电话', dataIndex: 'contact_phone', width: 130 },
    {
      title: '客户级别',
      dataIndex: 'customer_level',
      width: 90,
      render: (v: number | null) => {
        if (v == null) return '-'
        const lv = customerLevelMap[v]
        return lv ? <Tag color={lv.color}>{lv.label}</Tag> : '-'
      },
    },
    {
      title: '历史订单数',
      dataIndex: 'total_order_count',
      width: 100,
      render: (v: number) => v,
    },
    {
      title: '历史金额',
      dataIndex: 'total_order_amount',
      width: 120,
      render: (v: number) => `¥${v.toFixed(2)}`,
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
          </Tooltip>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button
            type="link"
            size="small"
            danger={record.status === 1}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === 1 ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ]

  const addressColumns: ColumnsType<CustomerAddress> = [
    {
      title: '地址类型',
      dataIndex: 'address_type',
      width: 80,
      render: (v: number) => addressTypeMap[v] || '-',
    },
    { title: '收件人', dataIndex: 'receiver_name', width: 90 },
    { title: '电话', dataIndex: 'receiver_phone', width: 120 },
    {
      title: '完整地址',
      key: 'full_address',
      render: (_, record) => {
        const parts = [record.province, record.city, record.district, record.detail_address].filter(Boolean)
        return parts.join(' ') || '-'
      },
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      width: 60,
      render: (v: number) => v === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEditAddress(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDeleteAddress(record)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const invoiceColumns: ColumnsType<CustomerInvoice> = [
    { title: '发票抬头', dataIndex: 'invoice_title', width: 160, ellipsis: true },
    { title: '税号', dataIndex: 'tax_no', width: 160, ellipsis: true },
    { title: '开户行', dataIndex: 'bank_name', width: 140, ellipsis: true },
    { title: '银行账号', dataIndex: 'bank_account', width: 160, ellipsis: true },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openEditInvoice(record)}>编辑</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索客户名称/编码"
            allowClear
            onSearch={handleSearch}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增客户
        </Button>
      </div>

      <Table<Customer>
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
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
        scroll={{ x: 1000 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editing ? '编辑客户' : '新增客户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
            <Input placeholder="请输入客户名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_person" label="对接人" rules={[{ required: true, message: '请输入对接人' }]}>
                <Input placeholder="请输入对接人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contact_phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                <Input placeholder="请输入电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customer_level" label="客户级别">
                <Select placeholder="请选择客户级别" options={customerLevelOptions} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="客户详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={700}
        loading={detailLoading}
      >
        {detailData && (
          <Tabs defaultActiveKey="basic" items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="客户编码">{detailData.customer_code}</Descriptions.Item>
                  <Descriptions.Item label="名称">{detailData.name}</Descriptions.Item>
                  <Descriptions.Item label="对接人">{detailData.contact_person}</Descriptions.Item>
                  <Descriptions.Item label="电话">{detailData.contact_phone}</Descriptions.Item>
                  <Descriptions.Item label="邮箱">{detailData.contact_email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="客户级别">
                    {detailData.customer_level != null
                      ? (() => { const lv = customerLevelMap[detailData.customer_level]; return lv ? <Tag color={lv.color}>{lv.label}</Tag> : '-' })()
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="历史订单数">{detailData.total_order_count}</Descriptions.Item>
                  <Descriptions.Item label="历史金额">¥{detailData.total_order_amount.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>{detailData.remark || '-'}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {detailData.status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{detailData.created_at}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'addresses',
              label: '收货地址',
              children: (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddAddress}>
                      新增地址
                    </Button>
                  </div>
                  <Table<CustomerAddress>
                    rowKey="id"
                    columns={addressColumns}
                    dataSource={detailData.addresses || []}
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'invoices',
              label: '开票信息',
              children: (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddInvoice}>
                      新增开票信息
                    </Button>
                  </div>
                  <Table<CustomerInvoice>
                    rowKey="id"
                    columns={invoiceColumns}
                    dataSource={detailData.invoices || []}
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            },
          ]} />
        )}
      </Drawer>

      {/* Address sub-modal */}
      <Modal
        title={editingAddress ? '编辑地址' : '新增地址'}
        open={addressModalOpen}
        onOk={handleAddressSubmit}
        onCancel={() => setAddressModalOpen(false)}
        destroyOnClose
        width={520}
      >
        <Form form={addressForm} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="address_type" label="地址类型" rules={[{ required: true, message: '请选择地址类型' }]}>
                <Select placeholder="请选择" options={addressTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_default" label="是否默认" initialValue={0}>
                <Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="receiver_name" label="收件人" rules={[{ required: true, message: '请输入收件人' }]}>
                <Input placeholder="请输入收件人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiver_phone" label="收件电话" rules={[{ required: true, message: '请输入收件电话' }]}>
                <Input placeholder="请输入收件电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="province" label="省份">
                <Input placeholder="省份" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label="城市">
                <Input placeholder="城市" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="区县">
                <Input placeholder="区县" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="detail_address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea rows={2} placeholder="请输入详细地址" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice sub-modal */}
      <Modal
        title={editingInvoice ? '编辑开票信息' : '新增开票信息'}
        open={invoiceModalOpen}
        onOk={handleInvoiceSubmit}
        onCancel={() => setInvoiceModalOpen(false)}
        destroyOnClose
        width={520}
      >
        <Form form={invoiceForm} layout="vertical" preserve={false}>
          <Form.Item name="invoice_title" label="发票抬头" rules={[{ required: true, message: '请输入发票抬头' }]}>
            <Input placeholder="请输入发票抬头" />
          </Form.Item>
          <Form.Item name="tax_no" label="税号" rules={[{ required: true, message: '请输入税号' }]}>
            <Input placeholder="请输入税号" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bank_name" label="开户行">
                <Input placeholder="请输入开户行" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bank_account" label="银行账号">
                <Input placeholder="请输入银行账号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="invoice_address" label="发票地址">
                <Input placeholder="请输入发票地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="invoice_phone" label="发票电话">
                <Input placeholder="请输入发票电话" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
