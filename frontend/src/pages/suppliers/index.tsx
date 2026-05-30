import { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, Select, Tag, message,
  Drawer, Descriptions, Tabs, InputNumber, Popconfirm, Row, Col, Tooltip,
} from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  getSuppliers, getSupplier, createSupplier, updateSupplier,
  toggleSupplierStatus, addSupplierMaterial, updateSupplierMaterial, deleteSupplierMaterial,
} from '@/api/suppliers'
import type { Supplier, SupplierMaterial } from '@/api/types'

const cooperationStatusMap: Record<number, { label: string; color: string }> = {
  1: { label: '正常合作', color: 'green' },
  2: { label: '暂停合作', color: 'orange' },
  3: { label: '已终止', color: 'red' },
}

const qualityRatingMap: Record<number, { label: string; color: string }> = {
  1: { label: '优', color: 'green' },
  2: { label: '良', color: 'blue' },
  3: { label: '差', color: 'red' },
}

const cooperationOptions = [
  { value: 1, label: '正常合作' },
  { value: 2, label: '暂停合作' },
  { value: 3, label: '已终止' },
]

const qualityRatingOptions = [
  { value: 1, label: '优' },
  { value: 2, label: '良' },
  { value: 3, label: '差' },
]

export default function SupplierPage() {
  const [data, setData] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [cooperationFilter, setCooperationFilter] = useState<number | undefined>(undefined)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  // Detail Drawer
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<Supplier | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Materials in modal
  const [modalMaterials, setModalMaterials] = useState<SupplierMaterial[]>([])
  const [materialModalOpen, setMaterialModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<SupplierMaterial | null>(null)
  const [materialForm] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (cooperationFilter !== undefined) params.cooperation_status = cooperationFilter
      const res = await getSuppliers(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取供应商列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, cooperationFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const handleCooperationFilter = (value: number | undefined) => {
    setCooperationFilter(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalMaterials([])
    setModalOpen(true)
  }

  const openEdit = async (record: Supplier) => {
    setEditing(record)
    form.resetFields()
    setModalMaterials([])
    setModalOpen(true)
    try {
      const res = await getSupplier(record.id)
      const s = res.data
      form.setFieldsValue({
        name: s.name,
        contact_person: s.contact_person,
        contact_phone: s.contact_phone,
        contact_email: s.contact_email,
        company_address: s.company_address,
        brands: s.brands,
        categories: s.categories,
        cooperation_status: s.cooperation_status,
        quality_rating: s.quality_rating,
        settlement_method: s.settlement_method,
        tax_rate: s.tax_rate,
        invoice_type: s.invoice_type,
        bank_name: s.bank_name,
        bank_account: s.bank_account,
        bank_account_name: s.bank_account_name,
        remark: s.remark,
      })
      setModalMaterials(s.materials || [])
    } catch {
      message.error('获取供应商详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editing) {
        await updateSupplier(editing.id, values)
        message.success('更新成功')
      } else {
        await createSupplier(values)
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

  const handleToggleStatus = async (record: Supplier) => {
    try {
      await toggleSupplierStatus(record.id)
      message.success(record.status === 1 ? '已停用' : '已启用')
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const openDetail = async (record: Supplier) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await getSupplier(record.id)
      setDetailData(res.data)
    } catch {
      message.error('获取供应商详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  // ---- Material management within modal ----
  const openAddMaterial = () => {
    setEditingMaterial(null)
    materialForm.resetFields()
    setMaterialModalOpen(true)
  }

  const openEditMaterial = (mat: SupplierMaterial) => {
    setEditingMaterial(mat)
    materialForm.setFieldsValue({
      material_id: mat.material_id,
      supply_price: mat.supply_price,
      is_primary: mat.is_primary,
    })
    setMaterialModalOpen(true)
  }

  const handleMaterialSubmit = async () => {
    if (!editing) return
    try {
      const values = await materialForm.validateFields()
      if (editingMaterial) {
        await updateSupplierMaterial(editing.id, editingMaterial.id, values)
        message.success('物料更新成功')
      } else {
        await addSupplierMaterial(editing.id, values)
        message.success('物料添加成功')
      }
      setMaterialModalOpen(false)
      // Refresh materials
      const res = await getSupplier(editing.id)
      setModalMaterials(res.data.materials || [])
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('操作失败')
      }
    }
  }

  const handleDeleteMaterial = async (mat: SupplierMaterial) => {
    if (!editing) return
    try {
      await deleteSupplierMaterial(editing.id, mat.id)
      message.success('物料已删除')
      const res = await getSupplier(editing.id)
      setModalMaterials(res.data.materials || [])
    } catch {
      message.error('删除失败')
    }
  }

  const materialColumns: ColumnsType<SupplierMaterial> = [
    { title: '物料ID', dataIndex: 'material_id', width: 80 },
    {
      title: '供货价格',
      dataIndex: 'supply_price',
      width: 120,
      render: (v: number | null) => v != null ? `¥${v.toFixed(2)}` : '-',
    },
    {
      title: '是否主供应商',
      dataIndex: 'is_primary',
      width: 100,
      render: (v: number) => v === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEditMaterial(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDeleteMaterial(record)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const columns: ColumnsType<Supplier> = [
    { title: '供应商编码', dataIndex: 'supplier_code', width: 130 },
    { title: '名称', dataIndex: 'name', width: 140, ellipsis: true },
    { title: '联系人', dataIndex: 'contact_person', width: 100 },
    { title: '电话', dataIndex: 'contact_phone', width: 130 },
    {
      title: '主营品牌',
      dataIndex: 'brands',
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '合作状态',
      dataIndex: 'cooperation_status',
      width: 100,
      render: (v: number) => {
        const s = cooperationStatusMap[v]
        return s ? <Tag color={s.color}>{s.label}</Tag> : '-'
      },
    },
    {
      title: '质量评级',
      dataIndex: 'quality_rating',
      width: 90,
      render: (v: number | null) => {
        if (v == null) return '-'
        const r = qualityRatingMap[v]
        return r ? <Tag color={r.color}>{r.label}</Tag> : '-'
      },
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

  const detailMaterialColumns: ColumnsType<SupplierMaterial> = [
    { title: '物料ID', dataIndex: 'material_id', width: 80 },
    {
      title: '供货价格',
      dataIndex: 'supply_price',
      width: 120,
      render: (v: number | null) => v != null ? `¥${v.toFixed(2)}` : '-',
    },
    {
      title: '是否主供应商',
      dataIndex: 'is_primary',
      width: 100,
      render: (v: number) => v === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索供应商名称/编码"
            allowClear
            onSearch={handleSearch}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="合作状态筛选"
            allowClear
            style={{ width: 150 }}
            options={cooperationOptions}
            onChange={handleCooperationFilter}
            value={cooperationFilter}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增供应商
        </Button>
      </div>

      <Table<Supplier>
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
        title={editing ? '编辑供应商' : '新增供应商'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={720}
      >
        <Tabs defaultActiveKey="basic" items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <Form form={form} layout="vertical" preserve={false}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="name" label="供应商名称" rules={[{ required: true, message: '请输入供应商名称' }]}>
                      <Input placeholder="请输入供应商名称" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="contact_person" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                      <Input placeholder="请输入联系人" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="contact_phone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                      <Input placeholder="请输入联系电话" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="contact_email" label="联系邮箱">
                      <Input placeholder="请输入联系邮箱" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="company_address" label="公司地址">
                  <Input placeholder="请输入公司地址" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="brands" label="主营品牌">
                      <Input placeholder="请输入主营品牌" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="categories" label="主营品类">
                      <Input placeholder="请输入主营品类" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="cooperation_status" label="合作状态" rules={[{ required: true, message: '请选择合作状态' }]}>
                      <Select placeholder="请选择合作状态" options={cooperationOptions} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="quality_rating" label="质量评级">
                      <Select placeholder="请选择质量评级" options={qualityRatingOptions} allowClear />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="settlement_method" label="结算方式">
                      <Input placeholder="请输入结算方式" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="tax_rate" label="税率(%)">
                      <InputNumber placeholder="请输入税率" min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="invoice_type" label="发票类型">
                      <Input placeholder="请输入发票类型" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="bank_name" label="开户银行">
                      <Input placeholder="请输入开户银行" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="bank_account" label="银行账号">
                      <Input placeholder="请输入银行账号" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="bank_account_name" label="开户名称">
                      <Input placeholder="请输入开户名称" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="remark" label="备注">
                  <Input.TextArea rows={2} placeholder="请输入备注" />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'materials',
            label: '关联物料',
            disabled: !editing,
            children: editing ? (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddMaterial}>
                    添加物料
                  </Button>
                </div>
                <Table<SupplierMaterial>
                  rowKey="id"
                  columns={materialColumns}
                  dataSource={modalMaterials}
                  pagination={false}
                  size="small"
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                请先保存供应商基本信息后再管理关联物料
              </div>
            ),
          },
        ]} />
      </Modal>

      {/* Material sub-modal */}
      <Modal
        title={editingMaterial ? '编辑物料' : '添加物料'}
        open={materialModalOpen}
        onOk={handleMaterialSubmit}
        onCancel={() => setMaterialModalOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={materialForm} layout="vertical" preserve={false}>
          <Form.Item name="material_id" label="物料ID" rules={[{ required: true, message: '请输入物料ID' }]}>
            <InputNumber placeholder="请输入物料ID" style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="supply_price" label="供货价格">
            <InputNumber placeholder="请输入供货价格" style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="is_primary" label="是否主供应商" initialValue={0}>
            <Select options={[{ value: 1, label: '是' }, { value: 0, label: '否' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="供应商详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={640}
        loading={detailLoading}
      >
        {detailData && (
          <Tabs defaultActiveKey="basic" items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="供应商编码">{detailData.supplier_code}</Descriptions.Item>
                  <Descriptions.Item label="名称">{detailData.name}</Descriptions.Item>
                  <Descriptions.Item label="联系人">{detailData.contact_person}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{detailData.contact_phone}</Descriptions.Item>
                  <Descriptions.Item label="联系邮箱">{detailData.contact_email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="公司地址" span={2}>{detailData.company_address || '-'}</Descriptions.Item>
                  <Descriptions.Item label="主营品牌">{detailData.brands || '-'}</Descriptions.Item>
                  <Descriptions.Item label="主营品类">{detailData.categories || '-'}</Descriptions.Item>
                  <Descriptions.Item label="合作状态">
                    {(() => { const s = cooperationStatusMap[detailData.cooperation_status]; return s ? <Tag color={s.color}>{s.label}</Tag> : '-' })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="质量评级">
                    {detailData.quality_rating != null
                      ? (() => { const r = qualityRatingMap[detailData.quality_rating]; return r ? <Tag color={r.color}>{r.label}</Tag> : '-' })()
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="结算方式">{detailData.settlement_method || '-'}</Descriptions.Item>
                  <Descriptions.Item label="税率">{detailData.tax_rate != null ? `${detailData.tax_rate}%` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="发票类型">{detailData.invoice_type || '-'}</Descriptions.Item>
                  <Descriptions.Item label="开户银行">{detailData.bank_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="银行账号">{detailData.bank_account || '-'}</Descriptions.Item>
                  <Descriptions.Item label="开户名称">{detailData.bank_account_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="采购总金额">¥{detailData.total_purchase_amount.toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="采购总次数">{detailData.total_purchase_count}</Descriptions.Item>
                  <Descriptions.Item label="最近采购日期">{detailData.last_purchase_date || '-'}</Descriptions.Item>
                  <Descriptions.Item label="备注" span={2}>{detailData.remark || '-'}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {detailData.status === 1 ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{detailData.created_at}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'materials',
              label: '关联物料',
              children: (
                <Table<SupplierMaterial>
                  rowKey="id"
                  columns={detailMaterialColumns}
                  dataSource={detailData.materials || []}
                  pagination={false}
                  size="small"
                />
              ),
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
