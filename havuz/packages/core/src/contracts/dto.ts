import type { Kurus } from '../money';
import type { PriceTier } from '../domain/pricing';
import type {
  BusinessType,
  IssueStatus,
  IssueType,
  ItemStatus,
  LedgerType,
  OrderStatus,
  PaymentStatus,
  PaymentTerm,
  Plan,
  Role,
  WaveStatus,
} from '../domain/enums';

/**
 * API yanıt sözleşmeleri. Tarihler ISO 8601 string olarak taşınır
 * (JSON güvenli, web ve React Native'de aynı şekilde çözülür).
 */
export type ISODate = string;

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  org: { id: string; name: string; plan: Plan; city: string; district: string | null };
}

export interface LoginResult {
  user: SessionUser;
  /** Mobil istemciler Authorization: Bearer ile kullanır; web httpOnly çerez kullanır. */
  token: string;
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface SupplierRefDTO {
  id: string;
  name: string;
  rating: number;
  onTimeRate: number;
}

export interface OfferDTO {
  id: string;
  supplier: SupplierRefDTO;
  basePrice: Kurus;
  tiers: PriceTier[];
  stock: number;
  leadTimeDays: number;
  active: boolean;
  sponsored: boolean;
  /** Açık dalgadaki havuz durumu (dalga yoksa null). */
  wave: {
    pooledQty: number;
    currentPrice: Kurus;
    next: { minQty: number; unitPrice: Kurus; remainingQty: number; progress: number } | null;
  } | null;
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  unit: string;
  packLabel: string;
  description: string;
  vatRate: number;
  marketPrice: Kurus;
  category: { id: string; slug: string; name: string; icon: string };
  offers: OfferDTO[];
  bestOfferId: string | null;
}

export interface WaveDTO {
  id: string;
  code: string;
  title: string;
  region: string;
  status: WaveStatus;
  opensAt: ISODate;
  cutoffAt: ISODate;
  deliveryAt: ISODate;
  memberCount: number;
  orderCount: number;
  volume: Kurus;
  totalCredit: Kurus;
}

export interface WaveOfferProgressDTO {
  offerId: string;
  productId: string;
  productName: string;
  unit: string;
  supplierName: string;
  categoryIcon: string;
  pooledQty: number;
  basePrice: Kurus;
  currentPrice: Kurus;
  bestPrice: Kurus;
  next: { minQty: number; unitPrice: Kurus; remainingQty: number; progress: number } | null;
}

export interface WaveDetailDTO extends WaveDTO {
  offers: WaveOfferProgressDTO[];
}

export interface OrderItemDTO {
  id: string;
  offerId: string;
  productId: string;
  productName: string;
  unit: string;
  categoryIcon: string;
  supplier: { id: string; name: string };
  qty: number;
  unitPrice: Kurus;
  finalUnitPrice: Kurus;
  marketPrice: Kurus;
  vatRate: number;
  status: ItemStatus;
  issue: { id: string; type: IssueType; status: IssueStatus; qty: number; note: string | null; creditAmount: Kurus } | null;
}

export interface OrderSummaryDTO {
  id: string;
  number: string;
  status: OrderStatus;
  createdAt: ISODate;
  wave: { id: string; code: string; title: string } | null;
  itemCount: number;
  supplierCount: number;
  total: Kurus;
  savings: Kurus;
  waveCredit: Kurus;
  paymentTerm: PaymentTerm;
  paymentStatus: PaymentStatus;
  dueAt: ISODate | null;
  member?: { id: string; name: string };
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  items: OrderItemDTO[];
  subtotal: Kurus;
  vat: Kurus;
  financingFee: Kurus;
  creditApplied: Kurus;
  marketTotal: Kurus;
  note: string | null;
  timeline: { status: OrderStatus; at: ISODate | null; done: boolean }[];
}

export interface CreateOrderResult {
  order: OrderDetailDTO;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface MemberDashboardDTO {
  org: { id: string; name: string; plan: Plan; creditLimit: Kurus };
  kpis: {
    monthSpend: Kurus;
    monthSavings: Kurus;
    savingRate: number;
    lifetimeSavings: Kurus;
    creditBalance: Kurus;
    outstanding: Kurus;
    activeOrders: number;
  };
  monthly: { month: string; spend: Kurus; savings: Kurus }[];
  byCategory: { category: string; icon: string; spend: Kurus }[];
  priceWatch: { productName: string; unit: string; yourPrice: Kurus; marketPrice: Kurus; peerMedian: Kurus }[];
  openWave: WaveDTO | null;
  recentOrders: OrderSummaryDTO[];
}

export interface LedgerEntryDTO {
  id: string;
  type: LedgerType;
  amount: Kurus;
  description: string;
  createdAt: ISODate;
}

export interface AccountDTO {
  org: {
    id: string;
    name: string;
    plan: Plan;
    businessType: BusinessType | null;
    city: string;
    district: string | null;
    taxNo: string | null;
    creditLimit: Kurus;
  };
  creditBalance: Kurus;
  outstanding: Kurus;
  ledger: LedgerEntryDTO[];
  dueOrders: OrderSummaryDTO[];
  invoices: { month: string; orderCount: number; total: Kurus; vat: Kurus }[];
}

export interface SupplierOrderItemDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  member: { id: string; name: string; district: string | null };
  productName: string;
  unit: string;
  categoryIcon: string;
  qty: number;
  unitPrice: Kurus;
  status: ItemStatus;
  createdAt: ISODate;
  wave: { code: string; deliveryAt: ISODate } | null;
}

export interface SupplierOfferDTO {
  id: string;
  product: { id: string; name: string; unit: string; packLabel: string; categoryIcon: string; marketPrice: Kurus };
  basePrice: Kurus;
  tiers: PriceTier[];
  stock: number;
  leadTimeDays: number;
  active: boolean;
  sponsored: boolean;
  pooledQty: number;
  last30Qty: number;
}

export interface SupplierDashboardDTO {
  supplier: { id: string; name: string; rating: number; onTimeRate: number; commissionBps: number };
  kpis: {
    monthRevenue: Kurus;
    pendingItems: number;
    toShipItems: number;
    activeMembers: number;
    issueRate: number;
  };
  monthly: { month: string; revenue: Kurus }[];
  forecast: { productName: string; unit: string; pooledQty: number; projectedQty: number }[];
  topProducts: { productName: string; qty: number; revenue: Kurus }[];
}

export interface AdminOverviewDTO {
  kpis: {
    gmvMonth: Kurus;
    gmvGrowth: number;
    revenueMonth: Kurus;
    activeMembers: number;
    totalMembers: number;
    suppliers: number;
    memberSavingsMonth: Kurus;
    openIssues: number;
    newLeads: number;
  };
  revenue: { commission: Kurus; subscriptions: Kurus; financing: Kurus; sponsored: Kurus; total: Kurus };
  monthly: { month: string; gmv: Kurus; revenue: Kurus }[];
  byCategory: { category: string; gmv: Kurus }[];
  openWave: WaveDTO | null;
  topMembers: { id: string; name: string; district: string | null; gmv: Kurus; savings: Kurus }[];
}

export interface AdminMemberDTO {
  id: string;
  name: string;
  businessType: BusinessType | null;
  city: string;
  district: string | null;
  plan: Plan;
  creditLimit: Kurus;
  outstanding: Kurus;
  gmv90: Kurus;
  orderCount: number;
  lastOrderAt: ISODate | null;
  joinedAt: ISODate;
}

export interface AdminSupplierDTO {
  id: string;
  name: string;
  city: string;
  rating: number;
  onTimeRate: number;
  commissionBps: number;
  offerCount: number;
  gmv90: Kurus;
  issueCount: number;
}

export interface AdminIssueDTO {
  id: string;
  type: IssueType;
  status: IssueStatus;
  qty: number;
  note: string | null;
  creditAmount: Kurus;
  createdAt: ISODate;
  orderNumber: string;
  orderId: string;
  member: string;
  supplier: string;
  productName: string;
  unitPrice: Kurus;
  vatRate: number;
}

export interface LeadDTO {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  businessType: BusinessType;
  monthlySpend: Kurus | null;
  kind: 'member' | 'supplier';
  createdAt: ISODate;
}

export interface PublicStatsDTO {
  members: number;
  suppliers: number;
  products: number;
  volume90: Kurus;
  savings90: Kurus;
  avgSavingRate: number;
  openWave: WaveDTO | null;
}
