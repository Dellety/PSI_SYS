// ==================== 角色 ====================
export enum EmployeeRole {
  ADMIN = 'admin',
  SALES = 'sales',
  PROJECT_MANAGER = 'project_manager',
  PURCHASER = 'purchaser',
}

export const RoleLabels: Record<EmployeeRole, string> = {
  [EmployeeRole.ADMIN]: '系统管理员',
  [EmployeeRole.SALES]: '销售员',
  [EmployeeRole.PROJECT_MANAGER]: '项目负责人',
  [EmployeeRole.PURCHASER]: '采购员',
}

// ==================== 订单状态 ====================
export enum OrderStatus {
  PENDING_CONFIRM = 'pending_confirm',
  PENDING_QUOTE = 'pending_quote',
  PENDING_CONTRACT = 'pending_contract',
  PENDING_DISPATCH = 'pending_dispatch',
  PENDING_PURCHASE = 'pending_purchase',
  PURCHASING = 'purchasing',
  PENDING_INSPECT = 'pending_inspect',
  INSPECTING = 'inspecting',
  PENDING_SHIP = 'pending_ship',
  SHIPPED = 'shipped',
  PENDING_RECEIPT = 'pending_receipt',
  RECEIVED = 'received',
  CLOSED = 'closed',
  RETURN_EXCHANGE = 'return_exchange',
  CANCELLED = 'cancelled',
}

export const OrderStatusLabels: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_CONFIRM]: '待确认内容',
  [OrderStatus.PENDING_QUOTE]: '待报价',
  [OrderStatus.PENDING_CONTRACT]: '待签合同',
  [OrderStatus.PENDING_DISPATCH]: '待下料',
  [OrderStatus.PENDING_PURCHASE]: '待采购',
  [OrderStatus.PURCHASING]: '采购中',
  [OrderStatus.PENDING_INSPECT]: '待验收',
  [OrderStatus.INSPECTING]: '验收中',
  [OrderStatus.PENDING_SHIP]: '待发货',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.PENDING_RECEIPT]: '待签收',
  [OrderStatus.RECEIVED]: '已签收',
  [OrderStatus.CLOSED]: '已关闭',
  [OrderStatus.RETURN_EXCHANGE]: '退换货中',
  [OrderStatus.CANCELLED]: '已取消',
}

// 采购单状态
export enum PurchaseStatus {
  PENDING = 'pending',
  PURCHASING = 'purchasing',
  ORDERED = 'ordered',
  ARRIVED = 'arrived',
  INSPECTED = 'inspected',
}

// 退换货状态
export enum ReturnStatus {
  PENDING_CONFIRM = 'pending_confirm',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ==================== 人员 ====================
export interface Employee {
  id: number
  employee_no: string
  login_name: string
  name: string
  phone: string
  email: string | null
  role: EmployeeRole
  status: number
  created_at: string
  updated_at: string
}

// ==================== 物料 ====================
export interface Material {
  id: number
  material_code: string
  name: string
  brand: string | null
  model: string | null
  specs: string | null
  unit: string
  category: string | null
  description: string | null
  status: number
  created_at: string
  updated_at: string
}

// ==================== 供应商 ====================
export interface Supplier {
  id: number
  supplier_code: string
  name: string
  contact_person: string
  contact_phone: string
  contact_email: string | null
  company_address: string | null
  brands: string | null
  categories: string | null
  cooperation_status: number
  first_cooperation_date: string | null
  avg_delivery_days: number | null
  quality_rating: number | null
  settlement_method: string | null
  tax_rate: number | null
  invoice_type: string | null
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
  total_purchase_amount: number
  total_purchase_count: number
  last_purchase_date: string | null
  remark: string | null
  status: number
  created_at: string
  updated_at: string
  materials?: SupplierMaterial[]
}

export interface SupplierMaterial {
  id: number
  supplier_id: number
  material_id: number
  supply_price: number | null
  supply_price_date: string | null
  is_primary: number
}

// ==================== 客户 ====================
export interface Customer {
  id: number
  customer_code: string
  name: string
  contact_person: string
  contact_phone: string
  contact_email: string | null
  sales_id: number | null
  customer_level: number | null
  total_order_amount: number
  total_order_count: number
  remark: string | null
  status: number
  created_at: string
  updated_at: string
  addresses?: CustomerAddress[]
  invoices?: CustomerInvoice[]
}

export interface CustomerAddress {
  id: number
  customer_id: number
  address_type: number
  receiver_name: string
  receiver_phone: string
  province: string | null
  city: string | null
  district: string | null
  detail_address: string
  is_default: number
  created_at: string
}

export interface CustomerInvoice {
  id: number
  customer_id: number
  invoice_title: string
  tax_no: string
  bank_name: string | null
  bank_account: string | null
  invoice_address: string | null
  invoice_phone: string | null
  created_at: string
  updated_at: string
}

// ==================== 订单 ====================
export interface ContractOrder {
  id: number
  order_no: string
  contract_no: string | null
  customer_id: number
  sales_id: number
  project_manager_id: number
  total_amount: number
  delivery_date: string | null
  sign_date: string | null
  is_urgent: number
  status: OrderStatus
  factory_demand_desc: string | null
  contract_attachment: string | null
  remark: string | null
  created_by: number
  closed_at: string | null
  closed_by: number | null
  created_at: string
  updated_at: string
  items?: ContractOrderItem[]
}

export interface ContractOrderItem {
  id: number
  order_id: number
  material_id: number
  material_code: string
  material_name: string
  brand: string | null
  model: string | null
  quantity: number
  unit: string
  unit_price: number
  amount: number
  purchase_price: number | null
  delivery_status: string
}

// ==================== 采购单 ====================
export interface PurchaseOrder {
  id: number
  purchase_no: string
  order_id: number
  order_item_id: number
  supplier_id: number
  material_id: number
  quantity: number
  unit_price: number
  total_amount: number
  purchaser_id: number
  status: PurchaseStatus
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  remark: string | null
  created_by: number
  created_at: string
  updated_at: string
}

// ==================== 验收/发货/签收/退换货 ====================
export interface InspectionRecord {
  id: number
  purchase_order_id: number
  inspector_id: number
  inspection_date: string
  inspection_result: number
  actual_quantity: number
  remark: string | null
  created_at: string
}

export interface ShipmentRecord {
  id: number
  order_id: number
  shipment_no: string
  express_company: string
  tracking_no: string
  receiver_name: string
  receiver_phone: string
  shipping_address: string
  shipment_date: string
  shipped_by: number
  address_confirmed_by: number | null
  address_confirmed_at: string | null
  remark: string | null
  created_at: string
}

export interface ReceiptRecord {
  id: number
  order_id: number
  shipment_id: number
  receipt_date: string
  receipt_status: number
  receipt_attachment: string | null
  archived_by: number | null
  archived_at: string | null
  created_at: string
}

export interface ReturnExchangeRecord {
  id: number
  return_no: string
  order_id: number
  order_item_id: number
  type: number
  reason: string
  initiator_id: number
  project_confirmed: number
  project_confirmed_by: number | null
  status: ReturnStatus
  purchase_order_id: number | null
  remark: string | null
  created_at: string
  updated_at: string
}

// ==================== 邮件/日志/配置 ====================
export interface EmailDraft {
  id: number
  trigger_event: string
  order_id: number
  recipient: string
  cc: string | null
  subject: string
  body: string
  status: number
  sent_at: string | null
  sent_by: number | null
  created_at: string
}

export interface OperationLog {
  id: number
  operator_id: number
  operator_name: string
  operator_role: number
  module: string
  action: string
  target_type: string
  target_id: number
  detail: string | null
  ip_address: string | null
  created_at: string
}

export interface SystemConfig {
  id: number
  config_key: string
  config_value: string
  config_type: string
  description: string | null
  updated_at: string
}

// ==================== 通用 ====================
export interface PaginatedResponse<T> {
  total: number
  items: T[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface DashboardStats {
  order_counts: Record<string, number>
  procurement_counts: Record<string, number>
  pending_shipment_count: number
  pending_delivery_count: number
  month_order_total: number
}
