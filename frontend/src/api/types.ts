export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  PURCHASER = 'purchaser',
  PROJECT_MANAGER = 'project_manager',
  SHIPPER = 'shipper',
  SALES = 'sales',
}

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  IN_PROCUREMENT = 'in_procurement',
  IN_SHIPPING = 'in_shipping',
  DELIVERED = 'delivered',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum ProcurementStatus {
  PENDING = 'pending',
  QUOTED = 'quoted',
  CONFIRMED = 'confirmed',
  ORDERED = 'ordered',
  RECEIVED = 'received',
}

export enum ShipmentStatus {
  PENDING = 'pending',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  ARRIVED = 'arrived',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum ItemCondition {
  NORMAL = 'normal',
  DAMAGED = 'damaged',
  SHORT = 'short',
}

export interface User {
  id: number
  username: string
  name: string
  phone: string | null
  email: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: number
  name: string
  company_name: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface Part {
  id: number
  part_number: string
  name: string
  brand: string | null
  spec: string | null
  category: string | null
  unit: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: number
  order_no: string
  customer_id: number
  sales_id: number
  status: OrderStatus
  total_amount: number
  notes: string | null
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  part_id: number
  quantity: number
  unit_price: number
  amount: number
  notes: string | null
}

export interface Procurement {
  id: number
  procurement_no: string
  order_id: number | null
  supplier_id: number
  purchaser_id: number
  status: ProcurementStatus
  total_amount: number
  notes: string | null
  items: ProcurementItem[]
  created_at: string
  updated_at: string
}

export interface ProcurementItem {
  id: number
  procurement_id: number
  part_id: number
  quantity: number
  unit_price: number
  amount: number
  expected_date: string | null
  notes: string | null
}

export interface Shipment {
  id: number
  shipment_no: string
  procurement_id: number
  shipper_id: number
  carrier: string | null
  tracking_no: string | null
  status: ShipmentStatus
  shipped_at: string | null
  notes: string | null
  items: ShipmentItem[]
  created_at: string
  updated_at: string
}

export interface ShipmentItem {
  id: number
  shipment_id: number
  part_id: number
  quantity: number
}

export interface Delivery {
  id: number
  delivery_no: string
  shipment_id: number
  status: DeliveryStatus
  delivered_at: string | null
  receiver_name: string | null
  receiver_phone: string | null
  notes: string | null
  items: DeliveryItem[]
  created_at: string
  updated_at: string
}

export interface DeliveryItem {
  id: number
  delivery_id: number
  part_id: number
  quantity: number
  condition: ItemCondition
}

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

export interface OrderStatusItem {
  status: string
  count: number
}

export interface ProcurementSummaryItem {
  supplier_id: number
  count: number
  total_amount: number
}
