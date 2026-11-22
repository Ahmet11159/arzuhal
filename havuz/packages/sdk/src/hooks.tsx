import { createContext, useContext, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type {
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
export const usePayOrder = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => c.member.payOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member'] });
      qc.invalidateQueries({ queryKey: qk.orders });
    },
  });
};
export const useUpgrade = () => {
  const c = useHavuz();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => c.member.upgrade(),
    onSuccess: () => qc.invalidateQueries(),
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
