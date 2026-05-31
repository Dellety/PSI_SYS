import { useState, useEffect, useCallback } from 'react'
import {
  Card, Form, Input, Button, message, Spin, Space, Tag, Modal, Divider,
} from 'antd'
import { MailOutlined, ClockCircleOutlined, TagOutlined, CarOutlined, ApiOutlined } from '@ant-design/icons'
import { getSettings, updateSetting, createSetting } from '@/api/settings'
import type { SystemConfig } from '@/api/types'

/** Config group definition */
interface ConfigGroup {
  title: string
  icon: React.ReactNode
  keys: string[]
  readOnly?: boolean
}

const CONFIG_GROUPS: ConfigGroup[] = [
  {
    title: '邮件服务',
    icon: <MailOutlined />,
    keys: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'],
  },
  {
    title: '超期预警',
    icon: <ClockCircleOutlined />,
    keys: ['OVERDUE_WARNING_DAYS'],
  },
  {
    title: '编号规则',
    icon: <TagOutlined />,
    keys: [],
    readOnly: true,
  },
  {
    title: '物料分类',
    icon: <TagOutlined />,
    keys: ['MATERIAL_CATEGORIES'],
  },
  {
    title: '快递公司',
    icon: <CarOutlined />,
    keys: ['EXPRESS_COMPANIES'],
  },
  {
    title: 'OA对接',
    icon: <ApiOutlined />,
    keys: ['OA_API_URL', 'OA_AUTH_TOKEN'],
  },
]

/** Friendly label map for config keys */
const KEY_LABELS: Record<string, string> = {
  SMTP_HOST: 'SMTP服务器',
  SMTP_PORT: 'SMTP端口',
  SMTP_USER: 'SMTP用户名',
  SMTP_PASSWORD: 'SMTP密码',
  SMTP_FROM: '发件人地址',
  OVERDUE_WARNING_DAYS: '预警天数阈值',
  MATERIAL_CATEGORIES: '物料分类',
  EXPRESS_COMPANIES: '快递公司列表',
  OA_API_URL: 'OA接口地址',
  OA_AUTH_TOKEN: 'OA认证令牌',
}

/** Keys whose values are JSON arrays */
const JSON_KEYS = new Set(['MATERIAL_CATEGORIES', 'EXPRESS_COMPANIES'])

function parseJsonSafe(value: string): string[] {
  try {
    const arr = JSON.parse(value)
    if (Array.isArray(arr)) return arr
  } catch { /* ignore */ }
  return []
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addForm] = Form.useForm()
  const [addSaving, setAddSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSettings()
      const list: SystemConfig[] = Array.isArray(res.data) ? res.data : []
      const map: Record<string, SystemConfig> = {}
      for (const c of list) {
        map[c.config_key] = c
      }
      setConfigs(map)
    } catch {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (key: string, value: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await updateSetting(key, { config_value: value })
      message.success(`${KEY_LABELS[key] || key} 保存成功`)
      fetchData()
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '保存失败')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleAddConfig = async () => {
    try {
      const values = await addForm.validateFields()
      setAddSaving(true)
      await createSetting(values)
      message.success('配置项创建成功')
      setAddModalOpen(false)
      addForm.resetFields()
      fetchData()
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        message.error(err.response.data.detail)
      } else if (!err?.errorFields) {
        message.error('创建失败')
      }
    } finally {
      setAddSaving(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
  }

  return (
    <div>
      <Card
        title="系统配置"
        size="small"
        extra={
          <Button type="primary" onClick={() => setAddModalOpen(true)}>
            新增配置项
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {CONFIG_GROUPS.map((group) => {
            const groupConfigs = group.keys
              .map((k) => configs[k])
              .filter(Boolean)

            // For the readOnly group (编号规则), show a note
            if (group.readOnly) {
              return (
                <Card
                  key={group.title}
                  type="inner"
                  title={<Space>{group.icon}{group.title}</Space>}
                  size="small"
                >
                  <Tag color="blue">订单编号</Tag>
                  <span>ORD-YYYYMMDD-SEQ</span>
                  <Divider type="vertical" />
                  <Tag color="blue">采购编号</Tag>
                  <span>PO-YYYYMMDD-SEQ</span>
                  <Divider type="vertical" />
                  <Tag color="blue">发货编号</Tag>
                  <span>SHP-YYYYMMDD-SEQ</span>
                  <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    编号规则由系统自动生成，如需修改请联系开发人员
                  </div>
                </Card>
              )
            }

            return (
              <ConfigGroupCard
                key={group.title}
                group={group}
                configs={groupConfigs}
                saving={saving}
                onSave={handleSave}
              />
            )
          })}

          {/* Ungrouped configs */}
          {(() => {
            const groupedKeys = new Set(CONFIG_GROUPS.flatMap((g) => g.keys))
            const ungrouped = Object.values(configs).filter(
              (c) => !groupedKeys.has(c.config_key)
            )
            if (ungrouped.length === 0) return null
            return (
              <ConfigGroupCard
                group={{ title: '其他配置', icon: <TagOutlined />, keys: ungrouped.map((c) => c.config_key) }}
                configs={ungrouped}
                saving={saving}
                onSave={handleSave}
              />
            )
          })()}
        </Space>
      </Card>

      {/* Add config modal */}
      <Modal
        title="新增配置项"
        open={addModalOpen}
        onOk={handleAddConfig}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields() }}
        confirmLoading={addSaving}
        okText="创建"
        width={500}
      >
        <Form form={addForm} layout="vertical" preserve={false}>
          <Form.Item
            name="config_key"
            label="配置键"
            rules={[{ required: true, message: '请输入配置键' }]}
          >
            <Input placeholder="如：SMTP_HOST" />
          </Form.Item>
          <Form.Item
            name="config_value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入配置值" />
          </Form.Item>
          <Form.Item name="config_type" label="类型">
            <Input placeholder="string / json / number" defaultValue="string" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="配置项描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

/** A single config group card */
function ConfigGroupCard({
  group,
  configs,
  saving,
  onSave,
}: {
  group: ConfigGroup
  configs: SystemConfig[]
  saving: Record<string, boolean>
  onSave: (key: string, value: string) => void
}) {
  return (
    <Card
      type="inner"
      title={<Space>{group.icon}{group.title}</Space>}
      size="small"
    >
      {configs.length === 0 && (
        <div style={{ color: '#999' }}>暂无配置项</div>
      )}
      {configs.map((config) => (
        <ConfigItem
          key={config.config_key}
          config={config}
          saving={!!saving[config.config_key]}
          onSave={onSave}
        />
      ))}
    </Card>
  )
}

/** A single config item row */
function ConfigItem({
  config,
  saving,
  onSave,
}: {
  config: SystemConfig
  saving: boolean
  onSave: (key: string, value: string) => void
}) {
  const isJson = JSON_KEYS.has(config.config_key)
  const isPassword = config.config_key.includes('PASSWORD')
  const label = KEY_LABELS[config.config_key] || config.config_key

  const [editValue, setEditValue] = useState(config.config_value || '')
  const [tagsValue, setTagsValue] = useState<string[]>(() => parseJsonSafe(config.config_value || ''))

  // Sync external changes
  useEffect(() => {
    setEditValue(config.config_value || '')
    setTagsValue(parseJsonSafe(config.config_value || ''))
  }, [config.config_value])

  const handleSave = () => {
    if (isJson) {
      onSave(config.config_key, JSON.stringify(tagsValue))
    } else {
      onSave(config.config_key, editValue)
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 4, fontWeight: 500 }}>
        {label}
        {config.description && (
          <span style={{ fontWeight: 400, color: '#999', marginLeft: 8, fontSize: 12 }}>
            {config.description}
          </span>
        )}
      </div>

      {isJson ? (
        <JsonArrayEditor
          value={tagsValue}
          onChange={setTagsValue}
          placeholder={`添加${label}项`}
        />
      ) : (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          type={isPassword ? 'password' : 'text'}
          placeholder={`请输入${label}`}
          style={{ maxWidth: 500 }}
        />
      )}

      <Button
        type="primary"
        size="small"
        loading={saving}
        onClick={handleSave}
        style={{ marginTop: 8, marginLeft: isJson ? 0 : 8 }}
      >
        保存
      </Button>
    </div>
  )
}

/** Simple tag-based editor for JSON arrays */
function JsonArrayEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) {
      message.warning('该项已存在')
      return
    }
    onChange([...value, trimmed])
    setInput('')
  }

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {value.map((item, idx) => (
          <Tag
            key={idx}
            closable
            onClose={() => handleRemove(idx)}
            style={{ marginBottom: 4 }}
          >
            {item}
          </Tag>
        ))}
      </div>
      <Space>
        <Input
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleAdd}
          placeholder={placeholder || '输入后回车添加'}
          style={{ width: 200 }}
        />
        <Button size="small" onClick={handleAdd}>添加</Button>
      </Space>
    </div>
  )
}
