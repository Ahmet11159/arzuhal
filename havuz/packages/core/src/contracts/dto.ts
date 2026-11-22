import type { Kurus } from '../money';
import type { PriceTier } from '../domain/pricing';
import type {
  LeadStatus,
  PaymentPurpose,
  PaymentRecordStatus,
  SettlementStatus,
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
  isOwner: boolean;
  mustChangePassword: boolean;
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
  issue: { id: string; type: IssueType; status: IssueStatus; qty: number; note: string | null; creditAmount: Kurus; photo: string | null } | null;
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
  /** Peşin siparişte kart ödemesinin son anı (ödenmezse iptal edilir). */
  paymentDeadline: ISODate | null;
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
  invoices: { key: string; month: string; orderCount: number; total: Kurus; vat: Kurus }[];
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
  active: boolean;
  taxNo: string | null;
  email: string | null;
  phone: string | null;
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
  active: boolean;
  iban: string | null;
  email: string | null;
  phone: string | null;
  district: string | null;
  pendingPayout: Kurus;
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
  photo: string | null;
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
  status: LeadStatus;
  orgId: string | null;
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

// ---------------------------------------------------------------------------
// Ödeme, hakediş, hesap, bildirim, kayıt
// ---------------------------------------------------------------------------
export interface StartPaymentResult {
  paymentId: string;
  /** Tarayıcının yönlendirileceği ödeme sayfası (test modu veya sağlayıcı). */
  redirectUrl: string;
  provider: string;
}

export interface PaymentDTO {
  id: string;
  purpose: PaymentPurpose;
  status: PaymentRecordStatus;
  amount: Kurus;
  provider: string;
  orgName: string;
  orderId: string | null;
  orderNumber: string | null;
  cardLast4: string | null;
  errorMessage: string | null;
  createdAt: ISODate;
  completedAt: ISODate | null;
}

export interface TestPaymentPageDTO {
  id: string;
  purpose: PaymentPurpose;
  orderId: string | null;
  status: PaymentRecordStatus;
  amount: Kurus;
  orgName: string;
  orderNumber: string | null;
  returnUrl: string;
}

export interface SettlementDTO {
  id: string;
  number: string;
  supplier: { id: string; name: string };
  periodEnd: ISODate;
  itemCount: number;
  grossSales: Kurus;
  commission: Kurus;
  issueDeductions: Kurus;
  netAmount: Kurus;
  status: SettlementStatus;
  reference: string | null;
  iban: string | null;
  createdAt: ISODate;
  paidAt: ISODate | null;
}

export interface SettlementDetailDTO extends SettlementDTO {
  items: {
    id: string;
    orderNumber: string;
    member: string;
    productName: string;
    unit: string;
    qty: number;
    finalUnitPrice: Kurus;
    vatRate: number;
    deliveredAt: ISODate | null;
    gross: Kurus;
    commission: Kurus;
  }[];
  issues: { id: string; orderNumber: string; productName: string; creditAmount: Kurus }[];
}

export interface PayoutOverviewDTO {
  /** Teslim edilmiş, henüz hakedişe girmemiş tutarlar. */
  pending: { itemCount: number; grossSales: Kurus; commission: Kurus; issueDeductions: Kurus; netAmount: Kurus };
  iban: string | null;
  settlements: SettlementDTO[];
}

export interface AdminPayoutRowDTO {
  supplier: { id: string; name: string; iban: string | null };
  itemCount: number;
  netAmount: Kurus;
  commission: Kurus;
}

export interface TeamUserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isOwner: boolean;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: ISODate | null;
  createdAt: ISODate;
}

export interface SettingsDTO {
  user: TeamUserDTO;
  org: { id: string; name: string; type: 'member' | 'supplier' | 'operator'; email: string | null; phone: string | null; iban: string | null };
  team: TeamUserDTO[];
}

export interface CreatedAccountDTO {
  orgId: string;
  userId: string;
  email: string;
  /** Yalnızca bu yanıtta bir kez gösterilir; kullanıcı ilk girişte değiştirmek zorundadır. */
  temporaryPassword: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: ISODate;
}

export interface AuditLogDTO {
  id: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  ip: string | null;
  createdAt: ISODate;
}

export interface OutboxDTO {
  id: string;
  channel: 'email' | 'whatsapp';
  recipient: string;
  subject: string;
  body: string | null;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  lastError: string | null;
  createdAt: ISODate;
  sentAt: ISODate | null;
}

export interface AdminProductDTO {
  id: string;
  sku: string;
  name: string;
  unit: string;
  packLabel: string;
  description: string;
  vatRate: number;
  marketPrice: Kurus;
  category: { id: string; name: string; icon: string };
  offerCount: number;
  bestPrice: Kurus | null;
}

export interface StatementDTO {
  month: string;
  label: string;
  org: { name: string; taxNo: string | null; city: string; district: string | null };
  orders: {
    number: string;
    date: ISODate;
    paymentTerm: PaymentTerm;
    lines: { productName: string; supplier: string; qty: number; unit: string; unitPrice: Kurus; vatRate: number; net: Kurus; vat: Kurus }[];
    subtotal: Kurus;
    vat: Kurus;
    financingFee: Kurus;
    creditApplied: Kurus;
    total: Kurus;
  }[];
  vatByRate: { rate: number; base: Kurus; vat: Kurus }[];
  totals: { subtotal: Kurus; vat: Kurus; financingFee: Kurus; creditApplied: Kurus; total: Kurus; waveCredits: Kurus };
}

export interface HealthDTO {
  ok: boolean;
  db: 'ok' | 'error';
  paymentProvider: string;
  emailProvider: string;
  whatsappProvider: string;
  version: string;
  time: ISODate;
}
