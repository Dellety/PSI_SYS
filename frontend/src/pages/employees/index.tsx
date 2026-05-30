import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Space, Modal, Form, Select, Tag, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getEmployees, createEmployee, updateEmployee, toggleEmployeeStatus } from '@/api/employees'
import { EmployeeRole, RoleLabels } from '@/api/types'
import type { Employee } from '@/api/types'

const roleOptions = Object.entries(RoleLabels).map(([value, label]) => ({
  value,
  label,
}))

export default function EmployeePage() {
  const [data, setData] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      if (roleFilter) params.role = roleFilter
      const res = await getEmployees(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取人员列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, roleFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const handleRoleFilter = (value: string | undefined) => {
    setRoleFilter(value)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: Employee) => {
    setEditing(record)
    form.setFieldsValue({
      employee_no: record.employee_no,
      name: record.name,
      login_name: record.login_name,
      phone: record.phone,
      email: record.email,
      role: record.role,
      password: undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editing) {
        const payload = { ...values }
        if (!payload.password) {
          delete payload.password
        }
        await updateEmployee(editing.id, payload)
        message.success('更新成功')
      } else {
        await createEmployee(values)
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

  const handleToggleStatus = async (record: Employee) => {
    try {
      await toggleEmployeeStatus(record.id)
      message.success(record.status === 1 ? '已停用' : '已启用')
      fetchData()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<Employee> = [
    { title: '工号', dataIndex: 'employee_no', width: 100 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '登录名', dataIndex: 'login_name', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email', width: 180, ellipsis: true },
    {
      title: '岗位',
      dataIndex: 'role',
      width: 120,
      render: (role: EmployeeRole) => RoleLabels[role] || role,
    },
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
            placeholder="搜索姓名/工号"
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="岗位筛选"
            allowClear
            style={{ width: 150 }}
            options={roleOptions}
            onChange={handleRoleFilter}
            value={roleFilter}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增员工
        </Button>
      </div>

      <Table<Employee>
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
        scroll={{ x: 900 }}
      />

      <Modal
        title={editing ? '编辑员工' : '新增员工'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="employee_no" label="工号" rules={[{ required: true, message: '请输入工号' }]}>
            <Input placeholder="请输入工号" />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="login_name" label="登录名" rules={[{ required: true, message: '请输入登录名' }]}>
            <Input placeholder="请输入登录名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="role" label="岗位" rules={[{ required: true, message: '请选择岗位' }]}>
            <Select placeholder="请选择岗位" options={roleOptions} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
            extra={editing ? '留空则不修改密码' : undefined}
          >
            <Input.Password placeholder={editing ? '留空则不修改' : '请输入密码'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
