import { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Tabs, Tag, Button, Space, Modal, Form, Input, message, Popconfirm,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getEmailDrafts, createEmailDraft, updateEmailDraft,
  sendEmailDraft, cancelEmailDraft,
} from '@/api/emailDrafts'
import type { EmailDraft } from '@/api/types'

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '待确认', color: 'orange' },
  2: { label: '已发送', color: 'green' },
  3: { label: '已取消', color: 'default' },
}

const baseColumns: ColumnsType<EmailDraft> = [
  { title: '触发事件', dataIndex: 'trigger_event', width: 120 },
  { title: '订单ID', dataIndex: 'order_id', width: 80 },
  { title: '收件人', dataIndex: 'recipient', width: 180, ellipsis: true },
  { title: '主题', dataIndex: 'subject', width: 200, ellipsis: true },
  {
    title: '状态', dataIndex: 'status', width: 90,
    render: (v: number) => {
      const s = STATUS_MAP[v]
      return s ? <Tag color={s.color}>{s.label}</Tag> : v
    },
  },
  {
    title: '创建时间', dataIndex: 'created_at', width: 160,
    render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '发送时间', dataIndex: 'sent_at', width: 160,
    render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
  },
]

export default function EmailsPage() {
  const [activeTab, setActiveTab] = useState('1')
  const [data, setData] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [editSaving, setEditSaving] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [createSaving, setCreateSaving] = useState(false)

  const fetchData = useCallback(async (status?: number) => {
    setLoading(true)
    try {
      const res = await getEmailDrafts(status)
      setData(Array.isArray(res.data) ? res.data : [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const status = activeTab === 'all' ? undefined : Number(activeTab)
    fetchData(status)
  }, [activeTab, fetchData])

  const handleView = (record: EmailDraft) => {
    setSelectedDraft(record)
    setDetailOpen(true)
  }

  const handleEdit = (record: EmailDraft) => {
    setSelectedDraft(record)
    editForm.setFieldsValue({
      recipient: record.recipient,
      cc: record.cc || '',
      subject: record.subject,
      body: record.body,
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!selectedDraft) return
    try {
      const values = await editForm.validateFields()
      setEditSaving(true)
      await updateEmailDraft(selectedDraft.id, values)
      message.success('草稿更新成功')
      setEditOpen(false)
      const status = activeTab === 'all' ? undefined : Number(activeTab)
      fetchData(status)
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('更新失败')
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleSend = async (id: number) => {
    try {
      await sendEmailDraft(id)
      message.success('邮件已发送')
      const status = activeTab === 'all' ? undefined : Number(activeTab)
      fetchData(status)
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('发送失败')
      }
    }
  }

  const handleCancel = async (id: number) => {
    try {
      await cancelEmailDraft(id)
      message.success('已取消')
      const status = activeTab === 'all' ? undefined : Number(activeTab)
      fetchData(status)
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('取消失败')
      }
    }
  }

  const handleCreate = () => {
    createForm.resetFields()
    setCreateOpen(true)
  }

  const handleCreateSave = async () => {
    try {
      const values = await createForm.validateFields()
      setCreateSaving(true)
      await createEmailDraft(values)
      message.success('草稿创建成功')
      setCreateOpen(false)
      const status = activeTab === 'all' ? undefined : Number(activeTab)
      fetchData(status)
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('创建失败')
      }
    } finally {
      setCreateSaving(false)
    }
  }

  const actionColumn: ColumnsType<EmailDraft>[number] = {
    title: '操作',
    width: 200,
    render: (_: any, record: EmailDraft) => (
      <Space size="small">
        <Button type="link" size="small" onClick={() => handleView(record)}>查看</Button>
        {record.status === 1 && (
          <>
            <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
            <Popconfirm title="确认发送此邮件？" onConfirm={() => handleSend(record.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small">发送</Button>
            </Popconfirm>
            <Popconfirm title="确认取消此草稿？" onConfirm={() => handleCancel(record.id)} okText="确认" cancelText="取消">
              <Button type="link" size="small" danger>取消</Button>
            </Popconfirm>
          </>
        )}
      </Space>
    ),
  }

  const columns = [...baseColumns, actionColumn]

  const tabItems = [
    { key: '1', label: '待发送' },
    { key: '2', label: '已发送' },
    { key: '3', label: '已取消' },
    { key: 'all', label: '全部' },
  ]

  return (
    <div>
      <Card
        title="邮件通知"
        size="small"
        extra={<Button type="primary" onClick={handleCreate}>创建草稿</Button>}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
        <Table<EmailDraft>
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      {/* View detail modal */}
      <Modal
        title="邮件详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {selectedDraft && (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            <p><strong>触发事件：</strong>{selectedDraft.trigger_event}</p>
            <p><strong>订单ID：</strong>{selectedDraft.order_id}</p>
            <p><strong>收件人：</strong>{selectedDraft.recipient}</p>
            <p><strong>抄送：</strong>{selectedDraft.cc || '-'}</p>
            <p><strong>主题：</strong>{selectedDraft.subject}</p>
            <p><strong>正文：</strong></p>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
              {selectedDraft.body}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit draft modal */}
      <Modal
        title="编辑草稿"
        open={editOpen}
        onOk={handleEditSave}
        onCancel={() => setEditOpen(false)}
        confirmLoading={editSaving}
        width={600}
        okText="保存"
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item name="recipient" label="收件人" rules={[{ required: true, message: '请输入收件人' }]}>
            <Input placeholder="请输入收件人邮箱" />
          </Form.Item>
          <Form.Item name="cc" label="抄送">
            <Input placeholder="抄送邮箱，多个用逗号分隔" />
          </Form.Item>
          <Form.Item name="subject" label="主题" rules={[{ required: true, message: '请输入主题' }]}>
            <Input placeholder="请输入邮件主题" />
          </Form.Item>
          <Form.Item name="body" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <Input.TextArea rows={8} placeholder="请输入邮件正文" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create draft modal */}
      <Modal
        title="创建邮件草稿"
        open={createOpen}
        onOk={handleCreateSave}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={createSaving}
        width={600}
        okText="创建"
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="trigger_event" label="触发事件" rules={[{ required: true, message: '请输入触发事件' }]}>
            <Input placeholder="如：订单创建、发货通知等" />
          </Form.Item>
          <Form.Item name="order_id" label="订单ID" rules={[{ required: true, message: '请输入订单ID' }]}>
            <Input type="number" placeholder="请输入关联订单ID" />
          </Form.Item>
          <Form.Item name="recipient" label="收件人" rules={[{ required: true, message: '请输入收件人' }]}>
            <Input placeholder="请输入收件人邮箱" />
          </Form.Item>
          <Form.Item name="cc" label="抄送">
            <Input placeholder="抄送邮箱，多个用逗号分隔" />
          </Form.Item>
          <Form.Item name="subject" label="主题" rules={[{ required: true, message: '请输入主题' }]}>
            <Input placeholder="请输入邮件主题" />
          </Form.Item>
          <Form.Item name="body" label="正文" rules={[{ required: true, message: '请输入正文' }]}>
            <Input.TextArea rows={8} placeholder="请输入邮件正文" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
