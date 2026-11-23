import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type {
  ChangePasswordInput,
  CompanyInput,
  PayoutProfileInput,
  UploadInvoiceInput,
  CreateCategoryInput,
  CreateOfferInput,
  CreateOrgInput,
  CreateProductInput,
  CreateSettlementsInput,
  InviteUserInput,
  MarkSettlementPaidInput,
  ProfileInput,
  StartPaymentInput,
  TestCardInput,
  UpdateOrgInput,
  UpdateProductInput,
  CreateOrderInput,
  CreateWaveInput,
  ProductQuery,
  ReportIssueInput,
  ResolveIssueInput,
  UpdateItemStatusInput,
  UpdateOfferInput,
} from '@havuz/core';
import type { HavuzClient } from './client';

const ClientContext = createContext<HavuzClient | null>(null);

export function HavuzClientProvider({ client, children }: { client: HavuzClient; children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export function useHavuz(): HavuzClient {
  const c = useContext(ClientContext);
  if (!c) throw new Error('useHavuz, HavuzClientProvider içinde kullanılmalı');
  return c;
}

/** Merkezi sorgu anahtarları — önbellek geçersizleştirme tek yerden yönetilir. */
export const qk = {
  me: ['me'] as const,
  stats: ['public', 'stats'] as const,
  categories: ['catalog', 'categories'] as const,
  products: (q: ProductQuery) => ['catalog', 'products', q] as const,
  product: (id: string) => ['catalog', 'product', id] as const,
  waves: ['waves'] as const,
  wave: (id: string) => ['waves', id] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  memberDashboard: ['member', 'dashboard'] as const,
  account: ['member', 'account'] as const,
  supplierDashboard: ['supplier', 'dashboard'] as const,
  supplierItems: ['supplier', 'items'] as const,
  supplierOffers: ['supplier', 'offers'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminMembers: ['admin', 'members'] as const,
  adminSuppliers: ['admin', 'suppliers'] as const,
  adminIssues: ['admin', 'issues'] as const,
  adminLeads: ['admin', 'leads'] as const,
  settings: ['account', 'settings'] as const,
  notifications: ['notifications'] as const,
  payments: ['payments'] as const,
  testPayment: (id: string) => ['payments', 'test', id] as const,
  statement: (m: string) => ['member', 'statement', m] as const,
  supplierPayouts: ['supplier', 'payouts'] as const,
  settlement: (id: string) => ['settlements', id] as const,
  adminProducts: ['admin', 'products'] as const,
  adminPayouts: ['admin', 'payouts'] as const,
  adminAudit: (q: string, e: string) => ['admin', 'audit', q, e] as const,
  adminOutbox: ['admin', 'outbox'] as const,
  payoutProfile: ['supplier', 'payout-profile'] as const,
  adminPayoutProfile: (id: string) => ['admin', 'payout-profile', id] as const,
  adminRefunds: ['admin', 'refunds'] as const,
};

type Opts<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

export const useMe = (o?: Opts<Awaited<ReturnType<HavuzClient['auth']['me']>>>) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.me, queryFn: () => c.auth.me(), ...o });
};
export const usePublicStats = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.stats, queryFn: () => c.public.stats() });
};
export const useCategories = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.categories, queryFn: () => c.catalog.categories(), staleTime: 5 * 60_000 });
};
export const useProducts = (q: ProductQuery = {}) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.products(q), queryFn: () => c.catalog.products(q), placeholderData: (prev) => prev });
};
export const useProduct = (id: string) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.product(id), queryFn: () => c.catalog.product(id), enabled: !!id });
};
export const useWaves = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.waves, queryFn: () => c.waves.list() });
};
export const useWave = (id: string | null | undefined) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.wave(id ?? ''), queryFn: () => c.waves.get(id!), enabled: !!id, refetchInterval: 30_000 });
};
export const useOrders = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.orders, queryFn: () => c.orders.list() });
};
export const useOrder = (id: string) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.order(id), queryFn: () => c.orders.get(id), enabled: !!id });
};
export const useMemberDashboard = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.memberDashboard, queryFn: () => c.member.dashboard() });
};
export const useAccount = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.account, queryFn: () => c.member.account() });
};
export const useSupplierDashboard = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.supplierDashboard, queryFn: () => c.supplier.dashboard() });
};
export const useSupplierItems = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.supplierItems, queryFn: () => c.supplier.items() });
};
export const useSupplierOffers = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.supplierOffers, queryFn: () => c.supplier.offers() });
};
export const useAdminOverview = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminOverview, queryFn: () => c.admin.overview() });
};
export const useAdminMembers = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminMembers, queryFn: () => c.admin.members() });
};
export const useAdminSuppliers = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminSuppliers, queryFn: () => c.admin.suppliers() });
};
export const useAdminIssues = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminIssues, queryFn: () => c.admin.issues() });
};
export const useAdminLeads = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminLeads, queryFn: () => c.admin.leads() });
};

// ---- Mutasyonlar ----

export const useLogin = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: c.auth.login,
    onSuccess: (r) => qc.setQueryData(qk.me, { user: r.user }),
  });
};
export const useLogout = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: c.auth.logout, onSuccess: () => qc.clear() });
};
export const useApply = () => {
  const c = useHavuz();
  return useMutation({ mutationFn: c.public.apply });
};
export const useCreateOrder = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => c.orders.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders });
      qc.invalidateQueries({ queryKey: ['catalog', 'products'] });
      qc.invalidateQueries({ queryKey: qk.waves });
      qc.invalidateQueries({ queryKey: ['member'] });
    },
  });
};
export const useReportIssue = (orderId: string) => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: ReportIssueInput }) => c.orders.reportIssue(orderId, itemId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.order(orderId) }),
  });
};
export const useConfirmDelivery = (orderId: string) => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => c.orders.confirmDelivery(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.order(orderId) });
      qc.invalidateQueries({ queryKey: qk.orders });
    },
  });
};
export const useUpdateSupplierItem = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateItemStatusInput }) => c.supplier.updateItem(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier'] }),
  });
};
export const useUpdateOffer = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOfferInput }) => c.supplier.updateOffer(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
};
export const useCreateWave = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWaveInput) => c.admin.createWave(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.waves });
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
};
export const useCloseWave = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => c.admin.closeWave(id),
    onSuccess: () => qc.invalidateQueries(),
  });
};
export const useResolveIssue = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveIssueInput }) => c.admin.resolveIssue(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};

// ---- Hesap, bildirim, ödeme, hakediş, yönetim ----

export const useSettings = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.settings, queryFn: () => c.account.settings() });
};
export const useNotifications = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.notifications, queryFn: () => c.notifications.list(), refetchInterval: 60_000 });
};
export const usePayments = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.payments, queryFn: () => c.payments.list() });
};
export const useTestPayment = (id: string) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.testPayment(id), queryFn: () => c.payments.testPage(id), enabled: !!id });
};
export const useStatement = (month: string) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.statement(month), queryFn: () => c.member.statement(month), enabled: !!month });
};
export const useSupplierPayouts = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.supplierPayouts, queryFn: () => c.supplier.payouts() });
};
export const useSettlement = (id: string) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.settlement(id), queryFn: () => c.settlements.get(id), enabled: !!id });
};
export const useAdminProducts = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminProducts, queryFn: () => c.admin.products() });
};
export const useAdminPayouts = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminPayouts, queryFn: () => c.admin.payouts() });
};
export const useAdminAudit = (q = '', entity = '') => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminAudit(q, entity), queryFn: () => c.admin.audit(q || undefined, entity || undefined), placeholderData: (p) => p });
};
export const useAdminOutbox = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminOutbox, queryFn: () => c.admin.outbox() });
};

export const useChangePassword = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: ChangePasswordInput) => c.auth.changePassword(i), onSuccess: () => qc.invalidateQueries() });
};
export const useForgotPassword = () => {
  const c = useHavuz();
  return useMutation({ mutationFn: c.auth.forgotPassword });
};
export const useResetPassword = () => {
  const c = useHavuz();
  return useMutation({ mutationFn: c.auth.resetPassword });
};
export const useUpdateProfile = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: ProfileInput) => c.account.updateProfile(i),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: qk.supplierPayouts });
    },
  });
};
export const useInviteUser = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: InviteUserInput) => c.account.invite(i), onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }) });
};
export const useSetUserActive = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => c.account.setUserActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
};
export const useMarkNotificationsRead = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id?: string) => c.notifications.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) });
};
export const useStartPayment = () => {
  const c = useHavuz();
  return useMutation({ mutationFn: (i: StartPaymentInput) => c.payments.start(i) });
};
export const useCompleteTestPayment = (id: string) => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (card: TestCardInput) => c.payments.completeTest(id, card), onSuccess: () => qc.invalidateQueries() });
};
export const useCancelOrder = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (orderId: string) => c.orders.cancel(orderId), onSuccess: () => qc.invalidateQueries() });
};
export const useCreateOffer = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: CreateOfferInput) => c.supplier.createOffer(i),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier'] });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
};
export const useCreateOrg = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CreateOrgInput) => c.admin.createOrg(i), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }) });
};
export const useUpdateOrg = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrgInput }) => c.admin.updateOrg(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};
export const useRejectLead = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => c.admin.rejectLead(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminLeads }) });
};
export const useCreateProduct = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: CreateProductInput) => c.admin.createProduct(i),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminProducts });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
};
export const useUpdateProduct = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) => c.admin.updateProduct(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminProducts });
      qc.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
};
export const useCreateCategory = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: CreateCategoryInput) => c.admin.createCategory(i),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories });
      qc.invalidateQueries({ queryKey: qk.adminProducts });
    },
  });
};
export const useCreateSettlements = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CreateSettlementsInput) => c.admin.createSettlements(i), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }) });
};
export const useMarkSettlementPaid = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarkSettlementPaidInput }) => c.admin.markSettlementPaid(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};

export const usePayoutProfile = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.payoutProfile, queryFn: () => c.supplier.payoutProfile() });
};
export const useUpdatePayoutProfile = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: PayoutProfileInput) => c.supplier.updatePayoutProfile(i),
    onSuccess: (d) => {
      qc.setQueryData(qk.payoutProfile, d);
      qc.invalidateQueries({ queryKey: ['supplier'] });
      qc.invalidateQueries({ queryKey: qk.settings });
    },
  });
};
export const useAdminPayoutProfile = (id: string | null) => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminPayoutProfile(id ?? ''), queryFn: () => c.admin.supplierPayoutProfile(id!), enabled: !!id });
};
export const useUpdateAdminPayoutProfile = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PayoutProfileInput }) => c.admin.updateSupplierPayoutProfile(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};
export const useSyncSupplier = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => c.admin.syncSupplier(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }) });
};
export const useAdminRefunds = () => {
  const c = useHavuz();
  return useQuery({ queryKey: qk.adminRefunds, queryFn: async () => (await c.admin.refunds()).refunds });
};
export const useRefundAction = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { action: 'retry' } | { action: 'mark_done'; note: string } }) => c.admin.refundAction(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminRefunds });
      qc.invalidateQueries({ queryKey: qk.payments });
    },
  });
};
export const useUploadInvoice = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: UploadInvoiceInput) => c.supplier.uploadInvoice(i),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.supplierItems });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
export const useCompany = () => {
  const c = useHavuz();
  return useQuery({ queryKey: ['admin', 'company'], queryFn: () => c.admin.company() });
};
export const useUpdateCompany = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (i: CompanyInput) => c.admin.updateCompany(i), onSuccess: (d) => qc.setQueryData(['admin', 'company'], d) });
};
