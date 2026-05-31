import { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Space, Tag, message, Modal, Form,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import * as shipmentApi from '@/api/shipmentRecords'
import type { ShipmentRecord } from '@/api/types'

export default function ShipmentListPage() {
  // list state
  const [data, setData] = useState<ShipmentRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')

  // tracking edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ShipmentRecord | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm] = Form.useForm()

  // ---------- fetch list ----------
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: pageSize }
      if (keyword) params.keyword = keyword
      const res = await shipmentApi.getShipments(params)
      setData(res.data.items)
      setTotal(res.data.total)
    } catch {
      message.error('获取发货记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- tracking edit ----------
  const openTrackingEdit = (record: ShipmentRecord) => {
    setEditRecord(record)
    editForm.setFieldsValue({
      express_company: record.express_company,
      tracking_no: record.tracking_no,
    })
    setEditOpen(true)
  }

  const handleTrackingSave = async () => {
    if (!editRecord) return
    try {
      const values = await editForm.validateFields()
      setEditSaving(true)
      await shipmentApi.updateTracking(editRecord.id, values)
      message.success('快递信息更新成功')
      setEditOpen(false)
      fetchData()
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

  // ---------- address confirm ----------
  const handleAddressConfirm = async (record: ShipmentRecord) => {
    try {
      await shipmentApi.confirmAddress(record.id)
      message.success('地址确认成功')
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else {
        message.error('确认失败')
      }
    }
  }

  // ---------- columns ----------
  const columns: ColumnsType<ShipmentRecord> = [
    {
      title: '发货单号',
      dataIndex: 'shipment_no',
      width: 140,
    },
    {
      title: '关联订单',
      dataIndex: 'order_id',
      width: 90,
    },
    {
      title: '快递公司',
      dataIndex: 'express_company',
      width: 110,
    },
    {
      title: '快递单号',
      dataIndex: 'tracking_no',
      width: 150,
    },
    {
      title: '收件人',
      dataIndex: 'receiver_name',
      width: 90,
    },
    {
      title: '联系电话',
      dataIndex: 'receiver_phone',
      width: 120,
    },
    {
      title: '收货地址',
      dataIndex: 'shipping_address',
      width: 200,
      ellipsis: true,
    },
    {
      title: '发货日期',
      dataIndex: 'shipment_date',
      width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-',
    },
    {
      title: '地址确认',
      dataIndex: 'address_confirmed_at',
      width: 100,
      render: (v: string | null) => v
        ? <Tag color="green">已确认</Tag>
        : <Tag color="orange">待确认</Tag>,
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openTrackingEdit(record)}>
            编辑快递
          </Button>
          {!record.address_confirmed_at && (
            <Button type="link" size="small" onClick={() => handleAddressConfirm(record)}>
              确认地址
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索发货单号/快递单号"
            allowClear
            onSearch={(v) => { setKeyword(v); setPage(1) }}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
        </Space>
      </div>

      {/* table */}
      <Table<ShipmentRecord>
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
        scroll={{ x: 1300 }}
      />

      {/* tracking edit modal */}
      <Modal
        title="编辑快递信息"
        open={editOpen}
        onOk={handleTrackingSave}
        onCancel={() => setEditOpen(false)}
        confirmLoading={editSaving}
        destroyOnClose
        okText="保存"
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item name="express_company" label="快递公司" rules={[{ required: true, message: '请输入快递公司' }]}>
            <Input placeholder="请输入快递公司" />
          </Form.Item>
          <Form.Item name="tracking_no" label="快递单号" rules={[{ required: true, message: '请输入快递单号' }]}>
            <Input placeholder="请输入快递单号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
