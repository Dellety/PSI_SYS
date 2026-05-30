import { useEffect, useState, useCallback } from 'react'
import { Button, Table, Space, Input, Modal, Form, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getParts, createPart, updatePart, deletePart } from '@/api/parts'
import type { Part } from '@/api/types'

export default function PartsPage() {
  const [data, setData] = useState<Part[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Part | null>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 10 }
      if (keyword) params.keyword = keyword
      const res = await getParts(params as any)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取备件列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, keyword])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Part) => {
    setEditing(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editing) {
        await updatePart(editing.id, values)
        message.success('更新成功')
      } else {
        await createPart(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error(editing ? '更新失败' : '创建失败')
      }
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deletePart(id)
      message.success('删除成功')
      fetchData()
    } catch {
      message.error('删除失败')
    }
  }

  const columns: ColumnsType<Part> = [
    { title: '备件编号', dataIndex: 'part_number', key: 'part_number', width: 140 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 100 },
    { title: '规格', dataIndex: 'spec', key: 'spec', width: 120 },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此备件？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索编号/名称/品牌/分类"
          style={{ width: 300 }}
          allowClear
          onSearch={(v) => { setKeyword(v); setPage(1) }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建备件
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
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
        title={editing ? '编辑备件' : '新建备件'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="part_number" label="备件编号" rules={[{ required: true, message: '请输入备件编号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input />
          </Form.Item>
          <Form.Item name="spec" label="规格">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
