import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Space, Modal, Form, Select, Tag, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getMaterials, createMaterial, updateMaterial, toggleMaterialStatus } from '@/api/materials'
import type { Material } from '@/api/types'

const categoryOptions = [
  { value: '轴承', label: '轴承' },
  { value: '密封件', label: '密封件' },
  { value: '紧固件', label: '紧固件' },
  { value: '电气元件', label: '电气元件' },
  { value: '液压件', label: '液压件' },
  { value: '传动件', label: '传动件' },
  { value: '过滤元件', label: '过滤元件' },
  { value: '其他', label: '其他' },
]

export default function MaterialPage() {
  const [data, setData] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (categoryFilter) params.category = categoryFilter
      const res = await getMaterials(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取物料列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const handleCategoryFilter = (value: string | undefined) => {
    setCategoryFilter(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Material) => {
    setEditing(record)
    form.setFieldsValue({
      material_code: record.material_code,
      name: record.name,
      brand: record.brand,
      model: record.model,
      specs: record.specs,
      unit: record.unit,
      category: record.category,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editing) {
        await updateMaterial(editing.id, values)
        message.success('更新成功')
      } else {
        await createMaterial(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (err?.errorFields) {
        // form validation error, ignore
      } else {
        message.error('操作失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (record: Material) => {
    try {
      await toggleMaterialStatus(record.id)
      message.success(record.status === 1 ? '已停用' : '已启用')
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<Material> = [
    { title: '物料编码', dataIndex: 'material_code', width: 120 },
    { title: '名称', dataIndex: 'name', width: 140 },
    { title: '品牌', dataIndex: 'brand', width: 100 },
    { title: '型号', dataIndex: 'model', width: 120 },
    { title: '规格', dataIndex: 'specs', width: 120, ellipsis: true },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '分类', dataIndex: 'category', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: number) =>
        status === 1 ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">停用</Tag>
        ),
    },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索编码/名称/品牌"
            allowClear
            onSearch={handleSearch}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 150 }}
            options={categoryOptions}
            onChange={handleCategoryFilter}
            value={categoryFilter}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增物料
        </Button>
      </div>

      <Table<Material>
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

      <Modal
        title={editing ? '编辑物料' : '新增物料'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="material_code" label="物料编码" rules={[{ required: true, message: '请输入物料编码' }]}>
            <Input placeholder="请输入物料编码（唯一）" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入物料名称" />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input placeholder="请输入品牌" />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input placeholder="请输入型号" />
          </Form.Item>
          <Form.Item name="specs" label="规格参数">
            <Input placeholder="请输入规格参数" />
          </Form.Item>
          <Form.Item name="unit" label="计量单位" rules={[{ required: true, message: '请输入计量单位' }]}>
            <Input placeholder="请输入计量单位，如：个、件、套" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Select placeholder="请选择分类" options={categoryOptions} allowClear />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
