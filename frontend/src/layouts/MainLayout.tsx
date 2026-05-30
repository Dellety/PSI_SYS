import { useState, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined, FileTextOutlined, ShoppingCartOutlined,
  ToolOutlined, TeamOutlined, ShopOutlined, UserOutlined,
  BarChartOutlined, LogoutOutlined, MailOutlined,
  FileSearchOutlined, SettingOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'
import { EmployeeRole, RoleLabels } from '@/api/types'

const { Header, Sider, Content } = Layout

// 按角色定义可见菜单
const allMenuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘', roles: null },
  { key: '/orders', icon: <FileTextOutlined />, label: '订单管理', roles: null },
  { key: '/purchases', icon: <ShoppingCartOutlined />, label: '采购管理', roles: [EmployeeRole.PURCHASER, EmployeeRole.ADMIN, EmployeeRole.PROJECT_MANAGER] },
  { key: '/materials', icon: <ToolOutlined />, label: '物料库', roles: null },
  { key: '/customers', icon: <TeamOutlined />, label: '客户管理', roles: null },
  { key: '/suppliers', icon: <ShopOutlined />, label: '供应商管理', roles: null },
  { key: '/employees', icon: <UserOutlined />, label: '人员花名册', roles: [EmployeeRole.ADMIN] },
  { key: '/emails', icon: <MailOutlined />, label: '邮件通知', roles: null },
  { key: '/logs', icon: <FileSearchOutlined />, label: '操作日志', roles: [EmployeeRole.ADMIN] },
  { key: '/reports', icon: <BarChartOutlined />, label: '统计报表', roles: null },
  { key: '/settings', icon: <SettingOutlined />, label: '系统配置', roles: [EmployeeRole.ADMIN] },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { token: themeToken } = theme.useToken()

  const menuItems = useMemo(() => {
    if (!user) return []
    const role = user.role as EmployeeRole
    return allMenuItems
      .filter(item => !item.roles || item.roles.includes(role) || role === EmployeeRole.ADMIN)
      .map(({ roles, ...rest }) => rest)
  }, [user])

  const handleMenuClick = ({ key }: { key: string }) => navigate(key)

  const handleLogout = () => { logout(); navigate('/login') }

  const dropdownItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{
          height: 48, margin: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff',
          fontSize: collapsed ? 16 : 18, fontWeight: 'bold',
          whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          {collapsed ? 'PSI' : 'PSI 备件管理'}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: themeToken.colorBgContainer,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || '用户'}</span>
              <span style={{ color: themeToken.colorTextSecondary, fontSize: 12 }}>
                {user?.role ? RoleLabels[user.role as EmployeeRole] || user.role : ''}
              </span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 16, padding: 24, background: themeToken.colorBgContainer,
          borderRadius: themeToken.borderRadiusLG, overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
