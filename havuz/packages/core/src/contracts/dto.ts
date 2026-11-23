import type { Kurus } from '../money';
import type { PriceTier } from '../domain/pricing';
import type { RefundReason, RefundStatus, SubMerchantType } from '../domain/marketplace';
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
  /** Ürün fotoğrafı adresi (önbellekli); yoksa kategori simgesi gösterilir */
  imageUrl: string | null;
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
  /** Ürün fotoğrafı adresi (varsa) */
  image: string | null;
  /** Teslim edildiyse sorun bildiriminin son anı */
  issueDeadline: ISODate | null;
}

export interface RefundDTO {
  id: string;
  orgName: string;
  orderId: string | null;
  orderNumber: string | null;
  amount: Kurus;
  reason: RefundReason;
  status: RefundStatus;
  description: string;
  error: string | null;
  attempts: number;
  createdAt: ISODate;
  completedAt: ISODate | null;
}

export interface OrderInvoiceDTO {
  id: string;
  supplier: { id: string; name: string };
  number: string;
  issuedAt: ISODate;
  amount: Kurus;
  fileName: string;
  mime: string;
  size: number;
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
  /** Karta iadeler (iptal, dalga farkı, mal kabul) */
  refunds: RefundDTO[];
  refundedTotal: Kurus;
  /** Tedarikçilerin yüklediği faturalar */
  invoices: OrderInvoiceDTO[];
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
    /** Dalga farkı, iptal ve mal kabul iadeleriyle üyeye dönen toplam (karta iade + borçtan düşüm) */
    returnedTotal: Kurus;
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
  /** Üyeye dönen toplam (hesap hareketlerinin toplamı) */
  returnedTotal: Kurus;
  outstanding: Kurus;
  ledger: LedgerEntryDTO[];
  refunds: RefundDTO[];
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
  /** Tedarikçi ödemesinin durumu */
  payoutStatus: 'awaiting_payment' | 'in_progress' | 'objection_period' | 'released' | 'settled' | 'cancelled';
  /** Bu sipariş için fatura yüklendi mi */
  invoiceUploaded: boolean;
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
  payout: PayoutProfileStatusDTO;
  /** Teslimden 3 gün geçmiş, faturası yüklenmemiş sipariş sayısı */
  missingInvoices: number;
}

export interface PayoutProfileStatusDTO {
  type: SubMerchantType | null;
  /** Bilgiler eksiksiz mi */
  complete: boolean;
  problems: string[];
  /** iyzico alt satıcı kaydı var mı */
  registered: boolean;
  error: string | null;
  syncedAt: ISODate | null;
}

export interface PayoutProfileDTO {
  subMerchantType: SubMerchantType | null;
  legalTitle: string | null;
  taxOffice: string | null;
  taxNo: string | null;
  /** Maskelenmiş (ör. 10*******46) */
  identityNumberMasked: string | null;
  contactName: string | null;
  address: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
  status: PayoutProfileStatusDTO;
  /** Pazaryeri açık mı (kayıt zorunlu) */
  marketplace: boolean;
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
  refundedAmount: Kurus;
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
  commissionVat: Kurus;
  issueDeductions: Kurus;
  netAmount: Kurus;
  /** iyzico: tedarikçiye iyzico öder (pazaryeri); manual: Havuz havale eder */
  channel: 'iyzico' | 'manual';
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
    /** İade öncesi KDV dahil tutar (+ vade farkı payı) */
    gross: Kurus;
    issueDeduction: Kurus;
    commission: Kurus;
    commissionVat: Kurus;
    payout: Kurus;
  }[];
  issues: { id: string; orderNumber: string; productName: string; creditAmount: Kurus }[];
}

export interface PayoutOverviewDTO {
  /** Teslim edilmiş, henüz hakedişe girmemiş tutarlar. */
  /** Onaylanmış (serbest bırakılmış), henüz hakediş belgesine girmemiş tutarlar. */
  pending: { itemCount: number; grossSales: Kurus; commission: Kurus; commissionVat: Kurus; issueDeductions: Kurus; netAmount: Kurus };
  /** Teslim/itiraz süresi/üye ödemesi bekleyen kalemler (tahmini) */
  awaiting: { itemCount: number; estimated: Kurus };
  iban: string | null;
  marketplace: boolean;
  profile: PayoutProfileStatusDTO;
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
  imageUrl: string | null;
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
    /** Karta iade edilen */
    refunded: Kurus;
  }[];
  vatByRate: { rate: number; base: Kurus; vat: Kurus }[];
  totals: { subtotal: Kurus; vat: Kurus; financingFee: Kurus; creditApplied: Kurus; total: Kurus; waveCredits: Kurus; refunded: Kurus };
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

export interface CompanyDTO {
  legalName: string;
  brandName: string;
  address: string;
  taxOffice: string;
  taxNo: string;
  mersisNo: string;
  tradeRegistryNo: string;
  phone: string;
  email: string;
  kepAddress: string;
  supportHours: string;
  kvkkEmail: string;
  etbisNo: string;
  /** Yönetim bilgileri girdi mi (girmediyse yasal sayfalarda yer tutucular görünür) */
  configured: boolean;
  updatedAt: ISODate | null;
}
