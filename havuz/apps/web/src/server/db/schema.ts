import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { PriceTier } from '@havuz/core';

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** Kuruluşlar: üye işletmeler, tedarikçiler ve platform operatörü. */
export const organizations = pgTable(
  'organizations',
  {
    id: id(),
    type: text('type', { enum: ['member', 'supplier', 'operator'] }).notNull(),
    name: text('name').notNull(),
    businessType: text('business_type', { enum: ['cafe', 'restaurant', 'bakery', 'bar', 'hotel', 'catering'] }),
    city: text('city').notNull(),
    district: text('district'),
    taxNo: text('tax_no'),
    plan: text('plan', { enum: ['free', 'pro'] }).notNull().default('free'),
    creditLimit: integer('credit_limit').notNull().default(0),
    // Tedarikçi alanları
    /** Pasif kuruluşun kullanıcıları giriş yapamaz. */
    active: boolean('active').notNull().default(true),
    email: text('email'),
    phone: text('phone'),
    /** Tedarikçi hakediş ödemeleri için. */
    iban: text('iban'),
    commissionBps: integer('commission_bps').notNull().default(300),
    rating: real('rating').notNull().default(4.5),
    onTimeRate: real('on_time_rate').notNull().default(0.95),
    createdAt: createdAt(),
  },
  (t) => [index('org_type_idx').on(t.type)],
);

export const users = pgTable('users', {
  id: id(),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['member', 'supplier', 'admin'] }).notNull(),
  /** Kuruluşun sahibi ekip üyesi ekleyip çıkarabilir. */
  isOwner: boolean('is_owner').notNull().default(false),
  active: boolean('active').notNull().default(true),
  /** Geçici şifreyle açılan hesap ilk girişte şifresini değiştirmek zorunda. */
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  /** Şifre değişince artar; eski oturum token'ları geçersiz olur. */
  tokenVersion: integer('token_version').notNull().default(0),
  phone: text('phone'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const categories = pgTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sort: integer('sort').notNull().default(0),
});

/** Standart ürün kartı: karşılaştırma ve havuzlama bu kart üzerinden yapılır. */
export const products = pgTable(
  'products',
  {
    id: id(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    packLabel: text('pack_label').notNull(),
    description: text('description').notNull().default(''),
    vatRate: integer('vat_rate').notNull().default(20),
    /** Piyasa referans fiyatı (kuruş, KDV hariç) — tasarruf hesabının bazı. */
    marketPrice: integer('market_price').notNull(),
  },
  (t) => [index('product_category_idx').on(t.categoryId)],
);

/** Tedarikçi teklifi: bir ürün için fiyat, kademeler ve stok. */
export const offers = pgTable(
  'offers',
  {
    id: id(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    basePrice: integer('base_price').notNull(),
    tiers: jsonb('tiers').$type<PriceTier[]>().notNull().default([]),
    stock: integer('stock').notNull().default(0),
    leadTimeDays: integer('lead_time_days').notNull().default(1),
    active: boolean('active').notNull().default(true),
    sponsored: boolean('sponsored').notNull().default(false),
    sponsoredFee: integer('sponsored_fee').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('offer_product_supplier_uq').on(t.productId, t.supplierId)],
);

/** Toplu sipariş dalgası. */
export const waves = pgTable('waves', {
  id: id(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  region: text('region').notNull(),
  status: text('status', { enum: ['scheduled', 'open', 'closed', 'delivered'] }).notNull().default('open'),
  opensAt: timestamp('opens_at', { withTimezone: true }).notNull().defaultNow(),
  cutoffAt: timestamp('cutoff_at', { withTimezone: true }).notNull(),
  deliveryAt: timestamp('delivery_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  totalCredit: integer('total_credit').notNull().default(0),
});

export const orders = pgTable(
  'orders',
  {
    id: id(),
    seq: integer('seq').generatedAlwaysAsIdentity(),
    number: text('number').notNull().unique(),
    memberId: text('member_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id').references(() => users.id),
    waveId: text('wave_id').references(() => waves.id),
    /** Kalem durumlarından türetilir (deriveOrderStatus); sorgu kolaylığı için saklanır. */
    status: text('status', { enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] })
      .notNull()
      .default('pending'),
    paymentTerm: text('payment_term', { enum: ['cash', 'net30', 'net60'] }).notNull(),
    /** unpaid: peşin sipariş, kart ödemesi bekleniyor (süresinde ödenmezse otomatik iptal). */
    paymentStatus: text('payment_status', { enum: ['unpaid', 'paid', 'due', 'overdue'] }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    subtotal: integer('subtotal').notNull(),
    vat: integer('vat').notNull(),
    financingFee: integer('financing_fee').notNull().default(0),
    creditApplied: integer('credit_applied').notNull().default(0),
    total: integer('total').notNull(),
    marketTotal: integer('market_total').notNull(),
    waveCredit: integer('wave_credit').notNull().default(0),
    note: text('note'),
    createdAt: createdAt(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (t) => [index('order_member_idx').on(t.memberId), index('order_wave_idx').on(t.waveId), index('order_created_idx').on(t.createdAt), index('order_status_idx').on(t.status)],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    offerId: text('offer_id')
      .notNull()
      .references(() => offers.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => organizations.id),
    qty: integer('qty').notNull(),
    unitPrice: integer('unit_price').notNull(),
    finalUnitPrice: integer('final_unit_price').notNull(),
    marketPrice: integer('market_price').notNull(),
    vatRate: integer('vat_rate').notNull(),
    commissionBps: integer('commission_bps').notNull(),
    status: text('status', { enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] })
      .notNull()
      .default('pending'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    /** Bu kalemin tedarikçiye ödendiği hakediş. */
    settlementId: text('settlement_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('item_order_idx').on(t.orderId), index('item_supplier_idx').on(t.supplierId), index('item_offer_idx').on(t.offerId), index('item_settlement_idx').on(t.settlementId)],
);

/** Mal kabul sorunları (eksik/hasarlı/kalite). */
export const issues = pgTable('issues', {
  id: id(),
  orderItemId: text('order_item_id')
    .notNull()
    .unique()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['missing', 'damaged', 'quality', 'wrong_item'] }).notNull(),
  qty: integer('qty').notNull(),
  note: text('note'),
  /** Sıkıştırılmış fotoğraf (data URL). Production'da nesne depolamaya (S3/R2) taşınmalı; burada yalnızca URL tutulur. */
  photo: text('photo'),
  status: text('status', { enum: ['open', 'resolved', 'rejected'] }).notNull().default('open'),
  creditAmount: integer('credit_amount').notNull().default(0),
  /** Onaylanan iadenin tedarikçi hakedişinden düşüldüğü hakediş. */
  settlementId: text('settlement_id'),
  createdAt: createdAt(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

/** Üye kredi defteri (dalga iadeleri, mal kabul iadeleri, kullanılan kredi). */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: id(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['wave_rebate', 'issue_credit', 'credit_used', 'adjustment'] }).notNull(),
    amount: integer('amount').notNull(),
    description: text('description').notNull(),
    refId: text('ref_id'),
    createdAt: createdAt(),
  },
  (t) => [index('ledger_org_idx').on(t.orgId)],
);

/** Açılış sayfasından gelen katılım başvuruları. */
export const leads = pgTable('leads', {
  id: id(),
  kind: text('kind', { enum: ['member', 'supplier'] }).notNull().default('member'),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  city: text('city').notNull(),
  businessType: text('business_type', { enum: ['cafe', 'restaurant', 'bakery', 'bar', 'hotel', 'catering'] }).notNull(),
  monthlySpend: integer('monthly_spend'),
  status: text('status', { enum: ['new', 'approved', 'rejected'] }).notNull().default('new'),
  orgId: text('org_id'),
  createdAt: createdAt(),
});

/** Pro üyelik faturaları (abonelik geliri). */
export const subscriptions = pgTable('subscriptions', {
  id: id(),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

/** Kart ödemeleri (peşin sipariş, vadeli borç, Pro üyelik). Sağlayıcıdan bağımsız. */
export const payments = pgTable(
  'payments',
  {
    id: id(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id').references(() => users.id),
    purpose: text('purpose', { enum: ['order', 'due', 'subscription'] }).notNull(),
    /** purpose=order|due → sipariş kimliği. */
    orderId: text('order_id').references(() => orders.id),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('TRY'),
    provider: text('provider').notNull(),
    status: text('status', { enum: ['pending', 'succeeded', 'failed', 'cancelled'] }).notNull().default('pending'),
    providerToken: text('provider_token'),
    providerPaymentId: text('provider_payment_id'),
    cardLast4: text('card_last4'),
    errorMessage: text('error_message'),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('payment_org_idx').on(t.orgId), index('payment_order_idx').on(t.orderId), index('payment_token_idx').on(t.providerToken)],
);

/** Tedarikçi hakedişi: teslim edilen kalemlerin komisyon ve iadeler düşülmüş ödemesi. */
export const settlements = pgTable(
  'settlements',
  {
    id: id(),
    seq: integer('seq').generatedAlwaysAsIdentity(),
    number: text('number').notNull().unique(),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => organizations.id),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    itemCount: integer('item_count').notNull(),
    grossSales: integer('gross_sales').notNull(),
    commission: integer('commission').notNull(),
    issueDeductions: integer('issue_deductions').notNull().default(0),
    netAmount: integer('net_amount').notNull(),
    status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
    reference: text('reference'),
    iban: text('iban'),
    createdAt: createdAt(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => [index('settlement_supplier_idx').on(t.supplierId)],
);

/** Uygulama içi bildirimler. userId boşsa kuruluşun tüm kullanıcılarına. */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    /** Aynı olayın iki kez bildirilmesini önler (örn. "vade-yaklasiyor:<sipariş>"). */
    dedupeKey: text('dedupe_key').unique(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notification_org_idx').on(t.orgId, t.createdAt)],
);

/** Dış kanallara (e-posta, WhatsApp) gönderilecek mesaj kuyruğu. */
export const outbox = pgTable(
  'outbox',
  {
    id: id(),
    channel: text('channel', { enum: ['email', 'whatsapp'] }).notNull(),
    recipient: text('recipient').notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    /** Şifre/sıfırlama bağlantısı içeren mesajın gövdesi yönetim ekranında gösterilmez. */
    sensitive: boolean('sensitive').notNull().default(false),
    status: text('status', { enum: ['pending', 'sent', 'failed', 'skipped'] }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [index('outbox_status_idx').on(t.status, t.nextAttemptAt)],
);

/** İşlem kaydı: kim, neyi, ne zaman değiştirdi. */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorUserId: text('actor_user_id'),
    actorOrgId: text('actor_org_id'),
    actorName: text('actor_name'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    summary: text('summary').notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    ip: text('ip'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_created_idx').on(t.createdAt), index('audit_entity_idx').on(t.entity, t.entityId)],
);

/** Şifre sıfırlama bağlantıları (yalnızca hash saklanır). */
export const passwordResets = pgTable('password_resets', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  offers: many(offers),
  orders: many(orders),
}));
export const usersRelations = relations(users, ({ one }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
}));
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  offers: many(offers),
}));
export const offersRelations = relations(offers, ({ one }) => ({
  product: one(products, { fields: [offers.productId], references: [products.id] }),
  supplier: one(organizations, { fields: [offers.supplierId], references: [organizations.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  member: one(organizations, { fields: [orders.memberId], references: [organizations.id] }),
  wave: one(waves, { fields: [orders.waveId], references: [waves.id] }),
  items: many(orderItems),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  offer: one(offers, { fields: [orderItems.offerId], references: [offers.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  supplier: one(organizations, { fields: [orderItems.supplierId], references: [organizations.id] }),
  issue: one(issues, { fields: [orderItems.id], references: [issues.orderItemId] }),
}));
export const issuesRelations = relations(issues, ({ one }) => ({
  item: one(orderItems, { fields: [issues.orderItemId], references: [orderItems.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  org: one(organizations, { fields: [payments.orgId], references: [organizations.id] }),
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const settlementsRelations = relations(settlements, ({ one }) => ({
  supplier: one(organizations, { fields: [settlements.supplierId], references: [organizations.id] }),
}));
