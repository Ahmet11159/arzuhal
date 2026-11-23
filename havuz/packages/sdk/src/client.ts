import type {
  CompanyDTO,
  CompanyInput,
  UploadInvoiceInput,
  PayoutProfileDTO,
  PayoutProfileInput,
  RefundDTO,
  AdminPayoutRowDTO,
  AdminProductDTO,
  AuditLogDTO,
  ChangePasswordInput,
  CreateCategoryInput,
  CreatedAccountDTO,
  CreateOfferInput,
  CreateOrgInput,
  CreateProductInput,
  CreateSettlementsInput,
  ForgotPasswordInput,
  InviteUserInput,
  MarkSettlementPaidInput,
  NotificationDTO,
  OutboxDTO,
  PaymentDTO,
  PayoutOverviewDTO,
  ProfileInput,
  ResetPasswordInput,
  SettingsDTO,
  SettlementDetailDTO,
  SettlementDTO,
  StartPaymentInput,
  StartPaymentResult,
  StatementDTO,
  TestCardInput,
  TestPaymentPageDTO,
  UpdateOrgInput,
  UpdateProductInput,
  AccountDTO,
  AdminIssueDTO,
  AdminMemberDTO,
  AdminOverviewDTO,
  AdminSupplierDTO,
  ApiErrorBody,
  CategoryDTO,
  CreateOrderInput,
  CreateOrderResult,
  CreateWaveInput,
  LeadDTO,
  LeadInput,
  LoginInput,
  LoginResult,
  MemberDashboardDTO,
  OrderDetailDTO,
  OrderSummaryDTO,
  ProductDTO,
  ProductQuery,
  PublicStatsDTO,
  ReportIssueInput,
  ResolveIssueInput,
  SessionUser,
  SupplierDashboardDTO,
  SupplierOfferDTO,
  SupplierOrderItemDTO,
  UpdateItemStatusInput,
  UpdateOfferInput,
  WaveDetailDTO,
  WaveDTO,
} from '@havuz/core';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HavuzClientOptions {
  /** Web'de '' (aynı origin), mobilde 'https://api.havuz.app'. */
  baseUrl: string;
  /** Mobil: güvenli depodan token döndürür. Web: undefined (httpOnly çerez). */
  getToken?: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
  onUnauthorized?: () => void;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Platformdan bağımsız, tip güvenli REST istemcisi.
 * Hiçbir DOM/Next.js API'si kullanmaz; React Native'de aynen çalışır.
 */
export function createHavuzClient(opts: HavuzClientOptions) {
  const doFetch = opts.fetch ?? fetch;

  async function request<T>(method: Method, path: string, body?: unknown, query?: Record<string, string | undefined>): Promise<T> {
    const qs = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
          .join('&')
      : '';
    const url = `${opts.baseUrl}/api/v1${path}${qs ? `?${qs}` : ''}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = opts.getToken ? await opts.getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await doFetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });

    if (res.status === 204) return undefined as T;
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const err = (json as ApiErrorBody | null)?.error;
      if (res.status === 401) opts.onUnauthorized?.();
      throw new ApiError(res.status, err?.code ?? 'unknown', err?.message ?? 'Beklenmeyen bir hata oluştu', err?.details);
    }
    return json as T;
  }

  return {
    auth: {
      login: (input: LoginInput) => request<LoginResult>('POST', '/auth/login', input),
      logout: () => request<void>('POST', '/auth/logout'),
      me: () => request<{ user: SessionUser }>('GET', '/auth/me'),
      changePassword: (input: ChangePasswordInput) => request<{ token: string }>('POST', '/auth/change-password', input),
      forgotPassword: (input: ForgotPasswordInput) => request<{ ok: true }>('POST', '/auth/forgot-password', input),
      resetPassword: (input: ResetPasswordInput) => request<{ ok: true }>('POST', '/auth/reset-password', input),
    },
    account: {
      settings: () => request<SettingsDTO>('GET', '/account/settings'),
      updateProfile: (input: ProfileInput) => request<{ ok: true }>('PATCH', '/account/profile', input),
      invite: (input: InviteUserInput) => request<CreatedAccountDTO>('POST', '/account/team', input),
      setUserActive: (userId: string, active: boolean) => request<{ ok: true }>('PATCH', `/account/team/${userId}`, { active }),
    },
    notifications: {
      list: () => request<{ notifications: NotificationDTO[]; unread: number }>('GET', '/notifications'),
      markRead: (id?: string) => request<{ ok: true }>('POST', '/notifications/read', { id }),
    },
    payments: {
      start: (input: StartPaymentInput) => request<StartPaymentResult>('POST', '/payments', input),
      list: () => request<{ payments: PaymentDTO[] }>('GET', '/payments'),
      testPage: (id: string) => request<{ payment: TestPaymentPageDTO }>('GET', `/payments/test/${id}`),
      completeTest: (id: string, card: TestCardInput) =>
        request<{ status: 'succeeded' | 'failed'; error?: string; returnUrl: string }>('POST', `/payments/test/${id}`, card),
    },
    settlements: {
      get: (id: string) => request<{ settlement: SettlementDetailDTO }>('GET', `/settlements/${id}`),
    },
    public: {
      stats: () => request<PublicStatsDTO>('GET', '/public/stats'),
      apply: (input: LeadInput) => request<{ ok: true }>('POST', '/public/leads', input),
    },
    catalog: {
      categories: () => request<{ categories: CategoryDTO[] }>('GET', '/catalog/categories'),
      products: (q: ProductQuery = {}) => request<{ products: ProductDTO[] }>('GET', '/catalog/products', undefined, q),
      product: (id: string) => request<{ product: ProductDTO }>('GET', `/catalog/products/${id}`),
    },
    waves: {
      list: () => request<{ waves: WaveDTO[] }>('GET', '/waves'),
      get: (id: string) => request<{ wave: WaveDetailDTO }>('GET', `/waves/${id}`),
    },
    member: {
      dashboard: () => request<MemberDashboardDTO>('GET', '/member/dashboard'),
      account: () => request<AccountDTO>('GET', '/member/account'),
      statement: (month: string) => request<{ statement: StatementDTO }>('GET', `/member/statements/${month}`),
    },
    orders: {
      list: () => request<{ orders: OrderSummaryDTO[] }>('GET', '/orders'),
      get: (id: string) => request<{ order: OrderDetailDTO }>('GET', `/orders/${id}`),
      create: (input: CreateOrderInput) => request<CreateOrderResult>('POST', '/orders', input),
      reportIssue: (orderId: string, itemId: string, input: ReportIssueInput) =>
        request<{ ok: true }>('POST', `/orders/${orderId}/items/${itemId}/issue`, input),
      confirmDelivery: (orderId: string) => request<{ ok: true }>('POST', `/orders/${orderId}/receive`),
      cancel: (orderId: string) => request<{ ok: true }>('POST', `/orders/${orderId}/cancel`),
    },
    supplier: {
      dashboard: () => request<SupplierDashboardDTO>('GET', '/supplier/dashboard'),
      items: () => request<{ items: SupplierOrderItemDTO[] }>('GET', '/supplier/items'),
      updateItem: (id: string, input: UpdateItemStatusInput) => request<{ ok: true }>('PATCH', `/supplier/items/${id}`, input),
      offers: () => request<{ offers: SupplierOfferDTO[] }>('GET', '/supplier/offers'),
      updateOffer: (id: string, input: UpdateOfferInput) => request<{ ok: true }>('PATCH', `/supplier/offers/${id}`, input),
      createOffer: (input: CreateOfferInput) => request<{ id: string }>('POST', '/supplier/offers', input),
      payouts: () => request<PayoutOverviewDTO>('GET', '/supplier/payouts'),
      payoutProfile: () => request<PayoutProfileDTO>('GET', '/supplier/payout-profile'),
      uploadInvoice: (input: UploadInvoiceInput) => request<{ id: string }>('POST', '/supplier/invoices', input),
      updatePayoutProfile: (input: PayoutProfileInput) => request<PayoutProfileDTO>('PUT', '/supplier/payout-profile', input),
    },
    admin: {
      overview: () => request<AdminOverviewDTO>('GET', '/admin/overview'),
      members: () => request<{ members: AdminMemberDTO[] }>('GET', '/admin/members'),
      suppliers: () => request<{ suppliers: AdminSupplierDTO[] }>('GET', '/admin/suppliers'),
      issues: () => request<{ issues: AdminIssueDTO[] }>('GET', '/admin/issues'),
      resolveIssue: (id: string, input: ResolveIssueInput) => request<{ ok: true }>('PATCH', `/admin/issues/${id}`, input),
      leads: () => request<{ leads: LeadDTO[] }>('GET', '/admin/leads'),
      createWave: (input: CreateWaveInput) => request<{ wave: WaveDTO }>('POST', '/admin/waves', input),
      closeWave: (id: string) =>
        request<{ totalCredit: number; members: number; offers: number }>('POST', `/admin/waves/${id}/close`),
      createOrg: (input: CreateOrgInput) => request<CreatedAccountDTO>('POST', '/admin/organizations', input),
      updateOrg: (id: string, input: UpdateOrgInput) => request<{ ok: true }>('PATCH', `/admin/organizations/${id}`, input),
      rejectLead: (id: string) => request<{ ok: true }>('PATCH', `/admin/leads/${id}`, { status: 'rejected' }),
      products: () => request<{ products: AdminProductDTO[] }>('GET', '/admin/products'),
      createProduct: (input: CreateProductInput) => request<{ id: string; sku: string }>('POST', '/admin/products', input),
      updateProduct: (id: string, input: UpdateProductInput) => request<{ ok: true }>('PATCH', `/admin/products/${id}`, input),
      createCategory: (input: CreateCategoryInput) => request<{ id: string }>('POST', '/admin/categories', input),
      payouts: () => request<{ pending: AdminPayoutRowDTO[]; settlements: SettlementDTO[] }>('GET', '/admin/payouts'),
      createSettlements: (input: CreateSettlementsInput) => request<{ created: SettlementDTO[] }>('POST', '/admin/settlements', input),
      markSettlementPaid: (id: string, input: MarkSettlementPaidInput) => request<{ ok: true }>('POST', `/admin/settlements/${id}/paid`, input),
      audit: (q?: string, entity?: string) => request<{ logs: AuditLogDTO[] }>('GET', '/admin/audit', undefined, { q, entity }),
      outbox: () => request<{ messages: OutboxDTO[] }>('GET', '/admin/outbox'),
      supplierPayoutProfile: (id: string) => request<PayoutProfileDTO>('GET', `/admin/suppliers/${id}/payout-profile`),
      updateSupplierPayoutProfile: (id: string, input: PayoutProfileInput) => request<PayoutProfileDTO>('PUT', `/admin/suppliers/${id}/payout-profile`, input),
      syncSupplier: (id: string) => request<{ synced: boolean; reason?: string }>('POST', `/admin/suppliers/${id}/sync`),
      refunds: () => request<{ refunds: RefundDTO[] }>('GET', '/admin/refunds'),
      company: () => request<CompanyDTO>('GET', '/admin/company'),
      updateCompany: (input: CompanyInput) => request<CompanyDTO>('PUT', '/admin/company', input),
      refundAction: (id: string, input: { action: 'retry' } | { action: 'mark_done'; note: string }) => request<{ ok: true }>('POST', `/admin/refunds/${id}`, input),
    },
  };
}

export type HavuzClient = ReturnType<typeof createHavuzClient>;
