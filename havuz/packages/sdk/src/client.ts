import type {
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

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

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
      payOrder: (orderId: string) => request<{ ok: true }>('POST', `/member/orders/${orderId}/pay`),
      upgrade: () => request<{ ok: true }>('POST', '/member/upgrade'),
    },
    orders: {
      list: () => request<{ orders: OrderSummaryDTO[] }>('GET', '/orders'),
      get: (id: string) => request<{ order: OrderDetailDTO }>('GET', `/orders/${id}`),
      create: (input: CreateOrderInput) => request<CreateOrderResult>('POST', '/orders', input),
      reportIssue: (orderId: string, itemId: string, input: ReportIssueInput) =>
        request<{ ok: true }>('POST', `/orders/${orderId}/items/${itemId}/issue`, input),
      confirmDelivery: (orderId: string) => request<{ ok: true }>('POST', `/orders/${orderId}/receive`),
    },
    supplier: {
      dashboard: () => request<SupplierDashboardDTO>('GET', '/supplier/dashboard'),
      items: () => request<{ items: SupplierOrderItemDTO[] }>('GET', '/supplier/items'),
      updateItem: (id: string, input: UpdateItemStatusInput) => request<{ ok: true }>('PATCH', `/supplier/items/${id}`, input),
      offers: () => request<{ offers: SupplierOfferDTO[] }>('GET', '/supplier/offers'),
      updateOffer: (id: string, input: UpdateOfferInput) => request<{ ok: true }>('PATCH', `/supplier/offers/${id}`, input),
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
    },
  };
}

export type HavuzClient = ReturnType<typeof createHavuzClient>;
