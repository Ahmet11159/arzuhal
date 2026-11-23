/**
 * Havuz arka uç doğrulama paketi — çalışan bir sunucuya karşı uçtan uca API testleri.
 *
 *   npm run db:reset
 *   BASE_URL=http://localhost:3100 npm run verify
 *   (DATABASE_URL + CRON_SECRET verilirse zamanlanmış işler, şifre sıfırlama ve ödeme süresi
 *    dolma testleri de çalışır; sunucu HAVUZ_SCHEDULER=off ile başlatılmalıdır)
 *
 * Mobil istemcinin kullanacağı Bearer token yolunu kullanır ve sistem değişmezlerini
 * (para, stok, karta iade, dalga farkı, pazaryeri payı, hakediş) eşzamanlı istekler altında da kontrol eder.
 */
import {
  closeWave,
  computeCharges,
  computeOrderTotals,
  FINANCING_BPS,
  normalizeIban,
  resolveTier,
  TEST_CARDS,
  type OfferDTO,
  type OrderDetailDTO,
  type ProductDTO,
} from '@havuz/core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const PW = 'havuz123';
const ACC = {
  memberA: 'uye@havuz.app',
  memberB: 'iletisim@yeldegirmeni-firin.demo',
  supplier1: 'tedarikci@havuz.app',
  supplier2: 'satis@kavrulmus-kahve-co.demo',
  admin: 'yonetim@havuz.app',
};
const CARD = { holder: 'Test Kullanıcı', expiry: '12/30', cvc: '123' };

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400));
  }
}
const section = (t: string) => console.log(`\n▸ ${t}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Res<T = any> {
  status: number;
  body: T;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api<T = any>(token: string | null, method: string, path: string, body?: unknown, rawBody?: string): Promise<Res<T>> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';
  // Sipariş oluşturmada koşul onayı zorunludur; testler aksini belirtmedikçe onaylı gönderir.
  if (method === 'POST' && path === '/orders' && body && typeof body === 'object' && !('acceptTerms' in body)) body = { ...body, acceptTerms: true };
  const r = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await r.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: r.status, body: json as T };
}
async function login(email: string, password = PW) {
  const r = await api(null, 'POST', '/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`Giriş başarısız: ${email} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token as string;
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

async function main() {
  const t = Object.fromEntries(await Promise.all(Object.entries(ACC).map(async ([k, e]) => [k, await login(e)]))) as Record<keyof typeof ACC, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pg: any = null;
  if (process.env.DATABASE_URL) {
    const { Client } = await import('pg');
    pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
  }

  const products: ProductDTO[] = (await api(t.memberA, 'GET', '/catalog/products')).body.products;
  const offerIndex = new Map<string, { p: ProductDTO; o: OfferDTO }>();
  for (const p of products) for (const o of p.offers) offerIndex.set(o.id, { p, o });
  const s1Offers = (await api(t.supplier1, 'GET', '/supplier/offers')).body.offers as { id: string; stock: number; basePrice: number }[];
  const stockOf = async (offerId: string) => ((await api(t.supplier1, 'GET', '/supplier/offers')).body.offers as { id: string; stock: number }[]).find((o) => o.id === offerId)!.stock;
  const returned = async (tok: string) => (await api(tok, 'GET', '/member/account')).body.returnedTotal as number;
  /** Arka planda gönderilen karta iadelerin tamamlanmasını bekler (en fazla ~6 sn). */
  const settledRefunds = async (tok: string, orderId: string) => {
    for (let i = 0; i < 30; i++) {
      const o = await getOrder(tok, orderId);
      if (o.refunds.length && o.refunds.every((r) => r.status === 'succeeded')) return o;
      await new Promise((r) => setTimeout(r, 200));
    }
    return getOrder(tok, orderId);
  };
  const outstanding = async (tok: string) => (await api(tok, 'GET', '/member/account')).body.outstanding as number;
  const getOrder = async (tok: string, id: string) => (await api<{ order: OrderDetailDTO }>(tok, 'GET', `/orders/${id}`)).body.order;
  const orgIdOf = async (tok: string) => (await api(tok, 'GET', '/auth/me')).body.user.org.id as string;
  /** Test sağlayıcısıyla ödemeyi başlatıp verilen kartla tamamlar. */
  const payWith = async (tok: string, input: unknown, card: string = TEST_CARDS.success) => {
    const start = await api(tok, 'POST', '/payments', input);
    if (start.status !== 200) return { start, done: null as Res | null };
    const done = await api(tok, 'POST', `/payments/test/${start.body.paymentId}`, { ...CARD, cardNumber: card });
    return { start, done };
  };

  // Vadeli testlerde limite takılmamak için limitleri yükselt (yönetim düzenleme yolunu da sınar).
  const [aOrg, bOrg] = [await orgIdOf(t.memberA), await orgIdOf(t.memberB)];
  for (const id of [aOrg, bOrg]) await api(t.admin, 'PATCH', `/admin/organizations/${id}`, { creditLimit: 500_000_000 });

  // ------------------------------------------------------------------
  section('Sağlık ve kimlik doğrulama');
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check('sağlık uç noktası: veritabanı ve sağlayıcılar', health.ok === true && health.db === 'ok' && !!health.paymentProvider, health);
  check('oturumsuz istek 401', (await api(null, 'GET', '/member/dashboard')).status === 401);
  check('yanlış şifre 401', (await api(null, 'POST', '/auth/login', { email: ACC.memberA, password: 'yanlis123' })).status === 401);
  check('sahte token 401', (await api('a.b.c', 'GET', '/member/dashboard')).status === 401);
  check('üye → yönetim API 403', (await api(t.memberA, 'GET', '/admin/overview')).status === 403);
  check('üye → hesap açma 403', (await api(t.memberA, 'POST', '/admin/organizations', {})).status === 403);
  check('tedarikçi → sipariş oluşturma 403', (await api(t.supplier1, 'POST', '/orders', { items: [] })).status === 403);
  check('tedarikçi → hakediş oluşturma 403', (await api(t.supplier1, 'POST', '/admin/settlements', { periodEnd: new Date().toISOString() })).status === 403);
  check('bozuk JSON → 4xx (500 değil)', [400, 422].includes((await api(t.memberA, 'POST', '/orders', undefined, '{bozuk')).status));
  check('şema dışı girdi → 422', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: 'x', qty: -3 }] })).status === 422);
  const probe = `kaba-kuvvet-${Date.now()}@ornek.demo`;
  const brute: number[] = [];
  for (let i = 0; i < 10; i++) brute.push((await api(null, 'POST', '/auth/login', { email: probe, password: 'yanlis-sifre' })).status);
  check('kaba kuvvet: 8 başarısız denemeden sonra hesap kilitlenir (429)', brute.slice(0, 8).every((x) => x === 401) && brute.slice(8).every((x) => x === 429), brute);
  check('başarılı girişler sayılmaz', (await api(null, 'POST', '/auth/login', { email: ACC.memberA, password: PW })).status === 200);
  check('/auth/me Bearer ile çalışır (mobil yolu)', (await api(t.memberA, 'GET', '/auth/me')).body?.user?.email === ACC.memberA);

  // ------------------------------------------------------------------
  section('Sipariş hesapları (kuruş hassasiyetinde)');
  const offA = s1Offers[0];
  const pA = offerIndex.get(offA.id)!.p;
  const stock0 = await stockOf(offA.id);
  const r1 = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 2 }], paymentTerm: 'net30' });
  check('vadeli sipariş oluşur', r1.status === 200, r1.body);
  check('koşul onayı olmadan sipariş reddedilir (422)', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'net30', acceptTerms: false })).status === 422);
  const o1 = r1.body.order;
  const exp = computeOrderTotals(o1.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, marketPrice: i.marketPrice, vatRate: i.vatRate })), { plan: 'free', term: 'net30' });
  check('birim fiyat = kendi miktarının kademesi', o1.items[0].unitPrice === resolveTier(offerIndex.get(offA.id)!.o, 2).unitPrice);
  check('ara toplam, KDV, vade farkı ve toplam core ile birebir', o1.subtotal === exp.subtotal && o1.vat === exp.vat && o1.financingFee === exp.financingFee && o1.total === exp.total);
  check(`KDV oranı ürün kartından (%${pA.vatRate})`, o1.items[0].vatRate === pA.vatRate);
  check('stok sipariş kadar düştü', (await stockOf(offA.id)) === stock0 - 2);
  check('vadeli sipariş "vadesi bekleniyor"', o1.paymentStatus === 'due' && !!o1.dueAt);
  check('üye başka üyenin siparişini göremez (404)', (await api(t.memberB, 'GET', `/orders/${o1.id}`)).status === 404);
  check('tedarikçi kendi kalemi olmayan siparişi göremez (404)', (await api(t.supplier2, 'GET', `/orders/${o1.id}`)).status === 404);
  check('başka tedarikçinin kalemi güncellenemez (404)', (await api(t.supplier2, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'confirmed' })).status === 404);
  check('geçersiz durum geçişi reddedilir', (await api(t.supplier1, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'delivered' })).status === 400);
  check('Temel üye 60 gün vade kullanamaz', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'net60' })).status === 400);
  await api(t.admin, 'PATCH', `/admin/organizations/${aOrg}`, { creditLimit: 100_000 });
  const big = await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 100 }], paymentTerm: 'net30' });
  check('vadeli limit aşımı reddedilir (credit_limit)', big.status === 422 && big.body?.error?.code === 'credit_limit', big.body);
  await api(t.admin, 'PATCH', `/admin/organizations/${aOrg}`, { creditLimit: 500_000_000 });
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offA.id}`, { stock: 15_000 });
  const over = await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 10_000 }, { offerId: offA.id, qty: 10_000 }], paymentTerm: 'cash' });
  check('aynı teklifin satırları birleştirilir; stoğu aşınca reddedilir', over.status === 400);
  check('reddedilen sipariş stoğa dokunmaz', (await stockOf(offA.id)) === 15_000);

  // ------------------------------------------------------------------
  section('Kartla ödeme (test sağlayıcısı)');
  const cash = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 3 }], paymentTerm: 'cash' })).body.order;
  check('peşin sipariş "ödeme bekleniyor" ve ödeme süresi var', cash.paymentStatus === 'unpaid' && !!cash.paymentDeadline, cash.paymentStatus);
  const supplierSees = async (orderId: string) => ((await api(t.supplier1, 'GET', '/supplier/items')).body.items as { orderId: string }[]).some((i) => i.orderId === orderId);
  check('ödenmemiş sipariş tedarikçiye görünmez', !(await supplierSees(cash.id)));
  check('ödenmemiş sipariş kalemi tedarikçi tarafından onaylanamaz', (await api(t.supplier1, 'PATCH', `/supplier/items/${cash.items[0].id}`, { status: 'confirmed' })).status === 400);
  check('başka üyenin siparişi için ödeme başlatılamaz (404)', (await api(t.memberB, 'POST', '/payments', { purpose: 'order', orderId: cash.id })).status === 404);
  const declined = await payWith(t.memberA, { purpose: 'order', orderId: cash.id }, TEST_CARDS.declined);
  check('reddedilen kart: ödeme başarısız, sipariş hâlâ ödenmedi', declined.done?.body.status === 'failed' && (await getOrder(t.memberA, cash.id)).paymentStatus === 'unpaid', declined.done?.body);
  check('başarısız ödeme tekrar kullanılamaz', (await api(t.memberA, 'POST', `/payments/test/${declined.start.body.paymentId}`, { ...CARD, cardNumber: TEST_CARDS.success })).status === 400);
  const ok1 = await payWith(t.memberA, { purpose: 'order', orderId: cash.id });
  check('başarılı kart: sipariş ödendi', ok1.done?.body.status === 'succeeded' && (await getOrder(t.memberA, cash.id)).paymentStatus === 'paid', ok1.done?.body);
  check('ödenen sipariş tedarikçiye görünür', await supplierSees(cash.id));
  check('ödenmiş siparişe ikinci ödeme başlatılamaz', (await api(t.memberA, 'POST', '/payments', { purpose: 'order', orderId: cash.id })).status === 400);
  const supNotes = (await api(t.supplier1, 'GET', '/notifications')).body;
  check('tedarikçiye "yeni sipariş" bildirimi gitti', supNotes.notifications.some((n: { title: string }) => n.title.includes(cash.number)), supNotes.notifications.slice(0, 3));
  const p2 = await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'cash' });
  const pA1 = await api(t.memberA, 'POST', '/payments', { purpose: 'order', orderId: p2.body.order.id });
  const pA2 = await api(t.memberA, 'POST', '/payments', { purpose: 'order', orderId: p2.body.order.id });
  check('yeni ödeme denemesi eskisini geçersiz kılar', (await api(t.memberA, 'POST', `/payments/test/${pA1.body.paymentId}`, { ...CARD, cardNumber: TEST_CARDS.success })).status === 400);
  const dbl = await Promise.all([1, 2].map(() => api(t.memberA, 'POST', `/payments/test/${pA2.body.paymentId}`, { ...CARD, cardNumber: TEST_CARDS.success })));
  check('aynı ödemenin eşzamanlı iki onayı tek kez işlenir', dbl.every((d) => d.status === 200 && d.body.status === 'succeeded'), dbl.map((d) => d.body));
  const cancelUnpaid = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 4 }], paymentTerm: 'cash' })).body.order;
  const stBefore = await stockOf(offA.id);
  check('üye ödemediği siparişi iptal edebilir', (await api(t.memberA, 'POST', `/orders/${cancelUnpaid.id}/cancel`)).status === 200);
  check('  → stok iade edildi', (await stockOf(offA.id)) === stBefore + 4);
  check('ödenmiş sipariş üye tarafından iptal edilemez', (await api(t.memberA, 'POST', `/orders/${cash.id}/cancel`)).status === 400);

  // ------------------------------------------------------------------
  section('İptal ve iade');
  const outBefore = await outstanding(t.memberA);
  const stockBeforeCancel = await stockOf(offA.id);
  check('iptal: vadeli siparişte borç düşer', (await api(t.supplier1, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'cancelled' })).status === 200);
  const o1b = await getOrder(t.memberA, o1.id);
  check('  → sipariş "iptal edildi" ve toplam 0', o1b.status === 'cancelled' && o1b.total === 0);
  check('  → açık bakiye sipariş tutarı kadar azaldı', (await outstanding(t.memberA)) === outBefore - o1.total);
  check('  → stok geri eklendi', (await stockOf(offA.id)) === stockBeforeCancel + o1.items[0].qty);
  const ret0 = await returned(t.memberA);
  await api(t.supplier1, 'PATCH', `/supplier/items/${cash.items[0].id}`, { status: 'cancelled' });
  const ci = cash.items[0];
  const gross = ci.qty * ci.finalUnitPrice + Math.round((ci.qty * ci.finalUnitPrice * ci.vatRate) / 100);
  const cashAfter = await settledRefunds(t.memberA, cash.id);
  check('iptal: kartla ödenmiş siparişte KDV dahil tutar karta iade edildi', cashAfter.refundedTotal === gross && cashAfter.refunds.every((r) => r.status === 'succeeded' && r.reason === 'item_cancelled'), { refunds: cashAfter.refunds, gross });
  check('  → üyenin hesap hareketlerine işlendi', (await returned(t.memberA)) === ret0 + gross);
  check('  → aynı iptal ikinci kez iade üretmez', (await api(t.supplier1, 'PATCH', `/supplier/items/${cash.items[0].id}`, { status: 'cancelled' })).status === 400 && (await getOrder(t.memberA, cash.id)).refundedTotal === gross);

  // ------------------------------------------------------------------
  section('Eşzamanlılık: stok yarışı (2 üye, 24 eşzamanlı sipariş, stok 10)');
  const offR = s1Offers[1];
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offR.id}`, { stock: 10 });
  const race = await Promise.all(Array.from({ length: 24 }, (_, i) => api(i % 2 ? t.memberA : t.memberB, 'POST', '/orders', { items: [{ offerId: offR.id, qty: 1 }], paymentTerm: 'net30' })));
  check('tam olarak 10 sipariş başarılı', race.filter((r) => r.status === 200).length === 10, race.map((r) => r.status));
  check('kalanlar 400, 500 yok', race.every((r) => r.status === 200 || r.status === 400));
  check('stok 0 — asla eksiye düşmedi', (await stockOf(offR.id)) === 0);

  section('Pazaryeri: tedarikçi payı ve eski kredi alanı');
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offR.id}`, { stock: 1_000 });
  const legacy = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offR.id, qty: 1 }], paymentTerm: 'net30', useCredit: true });
  check('eski "kredi kullan" alanı yok sayılır (kredi uygulanmaz)', legacy.status === 200 && legacy.body.order.creditApplied === 0);
  if (pg) {
    const pid = ok1.start.body.paymentId as string;
    const rows = (await pg.query(`select pi.price, pi.sub_merchant_key, pi.sub_merchant_price, pi.provider_txn_id, o.sub_merchant_key as sup_key from payment_items pi join organizations o on o.id = pi.supplier_id where pi.payment_id = $1`, [pid])).rows;
    const pay = (await pg.query(`select amount from payments where id = $1`, [pid])).rows[0];
    check('ödeme sepeti kalem toplamı = ödeme tutarı', rows.length > 0 && sum(rows.map((r: { price: number }) => r.price)) === pay.amount, { rows, pay });
    const exp = computeCharges(cash.items.map((i) => ({ id: i.id, qty: i.qty, finalUnitPrice: i.unitPrice, vatRate: i.vatRate, commissionBps: 300 })), 0);
    check('her kalem tedarikçinin alt satıcı anahtarını ve payını taşır', rows.every((r: { sub_merchant_key: string; sup_key: string; sub_merchant_price: number; price: number }) => r.sub_merchant_key === r.sup_key && r.sub_merchant_price > 0 && r.sub_merchant_price < r.price));
    check('tedarikçi payı = tutar − komisyon − komisyon KDV’si', rows[0].sub_merchant_price === exp.lines[0].supplierShare, { db: rows[0].sub_merchant_price, calc: exp.lines[0].supplierShare });
    check('kalemlere işlem numarası (iade/onay için) yazıldı', rows.every((r: { provider_txn_id: string | null }) => !!r.provider_txn_id));
  }

  // ------------------------------------------------------------------
  section('Dalga: havuz fiyatı, eşzamanlı kapanış, kademe iadesi');
  const waves = (await api(t.memberA, 'GET', '/waves')).body.waves as { id: string; status: string; cutoffAt: string; totalCredit: number }[];
  const wave = waves.filter((w) => w.status === 'open' && new Date(w.cutoffAt) > new Date()).sort((a, b) => +new Date(a.cutoffAt) - +new Date(b.cutoffAt))[0];
  check('açık dalga var', !!wave);
  const wdet = (await api(t.memberA, 'GET', `/waves/${wave.id}`)).body.wave;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = wdet.offers.find((o: any) => o.next && o.next.remainingQty > 1 && o.pooledQty > 0) ?? wdet.offers.find((o: any) => o.next);
  const tgtOffer = offerIndex.get(target.offerId)!.o;
  const first = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: 1 }], waveId: wave.id, paymentTerm: 'net30' });
  check('dalga siparişi: birim fiyat = havuz + kendi miktarı kademesi', first.status === 200 && first.body.order.items[0].unitPrice === resolveTier(tgtOffer, target.pooledQty + 1).unitPrice);
  const unpaidInWave = (await api<{ order: OrderDetailDTO }>(t.memberB, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: 2 }], waveId: wave.id, paymentTerm: 'cash' })).body.order;
  const racers = Array.from({ length: 8 }, (_, i) => api(i % 2 ? t.memberA : t.memberB, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: target.next.remainingQty }], waveId: wave.id, paymentTerm: 'net30' }));
  const closeP = (async () => {
    await new Promise((r) => setTimeout(r, 15));
    return api(t.admin, 'POST', `/admin/waves/${wave.id}/close`);
  })();
  const [closeRes, ...raceRes] = await Promise.all([closeP, ...racers]);
  check('dalga kapatıldı', closeRes.status === 200, closeRes.body);
  check('yarışan siparişler ya kabul ya "dalga kapandı" (500 yok)', raceRes.every((r) => r.status === 200 || r.status === 400), raceRes.map((r) => r.status));
  check('ödenmemiş dalga siparişi kapanışta iptal edildi', (await getOrder(t.memberB, unpaidInWave.id)).status === 'cancelled');
  check('ikinci kapatma reddedilir', (await api(t.admin, 'POST', `/admin/waves/${wave.id}/close`)).status === 400);
  check('kapalı dalgaya sipariş reddedilir', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: 1 }], waveId: wave.id })).status === 400);
  const allOrders = (await api(t.admin, 'GET', '/orders')).body.orders as { id: string; wave: { id: string } | null; waveCredit: number }[];
  const waveOrders = allOrders.filter((o) => o.wave?.id === wave.id);
  const details = await Promise.all(waveOrders.map((o) => api<{ order: OrderDetailDTO }>(t.admin, 'GET', `/orders/${o.id}`).then((r) => r.body.order)));
  const lines = details.flatMap((d) =>
    d.items.filter((i) => i.status !== 'cancelled').map((i) => ({ lineId: i.id, orderId: d.id, memberId: d.member?.id ?? d.id, offerId: i.offerId, qty: i.qty, paidUnitPrice: i.unitPrice, final: i.finalUnitPrice })),
  );
  const recomputed = closeWave(lines, Object.fromEntries([...new Set(lines.map((l) => l.offerId))].map((id) => [id, offerIndex.get(id)!.o])));
  const mismatched = recomputed.lines.filter((l) => l.finalUnitPrice !== lines.find((x) => x.lineId === l.lineId)!.final);
  check(`${lines.length} dalga kaleminin nihai fiyatı bağımsız yeniden hesapla birebir`, mismatched.length === 0, mismatched.slice(0, 3));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const closedWave = ((await api(t.admin, 'GET', '/waves')).body.waves as any[]).find((w) => w.id === wave.id);
  // Fark üyeye KDV ve vade farkı dahil döner: vadeli siparişte borç nihai fiyatlara iner.
  const planOf = new Map(((await api(t.admin, 'GET', '/admin/members')).body.members as { id: string; plan: 'free' | 'pro' }[]).map((m) => [m.id, m.plan]));
  const bpsOf = (d: OrderDetailDTO) => FINANCING_BPS[planOf.get(d.member?.id ?? '') ?? 'free'][d.paymentTerm] ?? 0;
  const expectedDrop = details
    .filter((d) => d.status !== 'cancelled')
    .map((d) => {
      const before = computeCharges(d.items.map((i) => ({ id: i.id, qty: i.qty, finalUnitPrice: i.unitPrice, vatRate: i.vatRate, commissionBps: 0, cancelled: i.status === 'cancelled' })), bpsOf(d)).total;
      const after = computeCharges(d.items.map((i) => ({ id: i.id, qty: i.qty, finalUnitPrice: i.finalUnitPrice, vatRate: i.vatRate, commissionBps: 0, cancelled: i.status === 'cancelled' })), bpsOf(d)).total;
      return { d, drop: before - after, after };
    });
  check('vadeli dalga siparişlerinin borcu nihai fiyatlara indi (KDV + vade farkı dahil)', expectedDrop.every((x) => x.d.paymentStatus !== 'due' || x.d.total === x.after), expectedDrop.filter((x) => x.d.total !== x.after).slice(0, 2).map((x) => ({ total: x.d.total, after: x.after })));
  check('sipariş bazlı farkların toplamı = dalga toplam farkı', sum(waveOrders.map((o) => o.waveCredit)) === closedWave.totalCredit, { orders: sum(waveOrders.map((o) => o.waveCredit)), wave: closedWave.totalCredit });
  check('sipariş farkları bağımsız hesapla birebir', expectedDrop.every((x) => x.d.waveCredit === x.drop), expectedDrop.filter((x) => x.d.waveCredit !== x.drop).slice(0, 2).map((x) => ({ db: x.d.waveCredit, calc: x.drop })));
  check('fark, net kademe iadesinden az değil (KDV eklenir)', closedWave.totalCredit >= recomputed.totalCredit, { db: closedWave.totalCredit, net: recomputed.totalCredit });
  check('hiçbir kalem ödediğinden pahalıya kapanmadı', lines.every((l) => l.final <= l.paidUnitPrice));

  // ------------------------------------------------------------------
  section('Mal kabul bildirimi');
  const mo = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 2 }], paymentTerm: 'net30' })).body.order;
  const it = mo.items[0];
  check('teslim edilmemiş ürüne bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1 })).status === 400);
  for (const st of ['confirmed', 'shipped']) await api(t.supplier1, 'PATCH', `/supplier/items/${it.id}`, { status: st });
  check('üye "teslim aldım" der', (await api(t.memberA, 'POST', `/orders/${mo.id}/receive`)).status === 200);
  check('miktardan fazla bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 99 })).status === 400);
  check('zararlı dosya türü reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1, photo: 'data:text/html;base64,PHNjcmlwdD4=' })).status === 422);
  check('bildirim kaydedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1, note: 'test' })).status === 200);
  check('aynı ürüne ikinci bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'missing', qty: 1 })).status === 400);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issue = ((await api(t.admin, 'GET', '/admin/issues')).body.issues as any[]).find((i) => i.orderId === mo.id);
  const retI = await returned(t.memberA);
  const moBefore = await getOrder(t.memberA, mo.id);
  const triple = await Promise.all([1, 2, 3].map(() => api(t.admin, 'PATCH', `/admin/issues/${issue.id}`, { status: 'resolved' })));
  const expectedCredit = Math.round(1 * it.finalUnitPrice * (1 + it.vatRate / 100));
  check('eşzamanlı 3 onaydan yalnızca 1’i geçer', triple.filter((r) => r.status === 200).length === 1, triple.map((r) => r.status));
  const moAfter = await getOrder(t.memberA, mo.id);
  const moExp = computeCharges(moAfter.items.map((i) => ({ id: i.id, qty: i.qty, finalUnitPrice: i.finalUnitPrice, vatRate: i.vatRate, commissionBps: 0, issueCredit: i.issue?.status === 'resolved' ? i.issue.creditAmount : 0 })), FINANCING_BPS.free.net30!);
  check('vadeli siparişte iade borçtan düşüldü (KDV dahil, vade farkı orantılı)', moAfter.total === moExp.total && moAfter.total < moBefore.total, { before: moBefore.total, after: moAfter.total, exp: moExp.total });
  check('iade tam bir kez ve KDV dahil işlendi', moAfter.items[0].issue?.creditAmount === expectedCredit && (await returned(t.memberA)) === retI + (moBefore.total - moAfter.total));

  // ------------------------------------------------------------------
  section('Tedarikçi hakedişi (pazaryeri mutabakatı)');
  const before = (await api(t.supplier1, 'GET', '/supplier/payouts')).body;
  check('onaylanmış (serbest bırakılmış) kalemler var', before.pending.itemCount > 0, before.pending);
  check('pazaryeri açık ve tedarikçi iyzico’ya kayıtlı', before.marketplace === true && before.profile.registered === true && before.profile.complete === true, before.profile);
  check('bekleyen tutar: satış − iade − komisyon − komisyon KDV = net', before.pending.netAmount === before.pending.grossSales - before.pending.issueDeductions - before.pending.commission - before.pending.commissionVat, before.pending);
  check('tedarikçi IBAN’ı geçerli (mod-97)', !!before.iban && normalizeIban(before.iban) === before.iban);
  const periodEnd = new Date().toISOString();
  const [c1, c2] = await Promise.all([1, 2].map(() => api(t.admin, 'POST', '/admin/settlements', { periodEnd })));
  check('eşzamanlı iki hakediş oluşturma çağrısı hata vermez', c1.status === 200 && c2.status === 200, [c1.body, c2.body]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = [...c1.body.created, ...c2.body.created].filter((x: any) => x.supplier.name === 'Anadolu Gıda Toptan');
  check('her kalem yalnızca bir hakedişe girdi (çift sayım yok)', sum(created.map((x: { itemCount: number }) => x.itemCount)) === before.pending.itemCount, { created: created.map((x: { itemCount: number }) => x.itemCount), expected: before.pending.itemCount });
  check('hakediş toplamı bekleyen tutarla aynı', sum(created.map((x: { netAmount: number }) => x.netAmount)) === before.pending.netAmount);
  const after = (await api(t.supplier1, 'GET', '/supplier/payouts')).body;
  check('hakediş sonrası bekleyen bakiye sıfırlandı', after.pending.itemCount === 0 && after.pending.netAmount === 0, after.pending);
  const stId = created[0].id;
  const det = (await api(t.supplier1, 'GET', `/settlements/${stId}`)).body.settlement;
  check('pazaryerinde hakedişi iyzico öder (kanal iyzico, ödendi)', det.channel === 'iyzico' && det.status === 'paid', { channel: det.channel, status: det.status });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineOk = det.items.every((i: any) => i.payout === i.gross - i.issueDeduction - i.commission - i.commissionVat);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineSum = sum(det.items.map((i: any) => i.payout));
  check('her satır: KDV dahil − iade − komisyon − komisyon KDV = net; satırlar toplamı = belge', lineOk && lineSum === det.netAmount, { lineOk, lineSum, net: det.netAmount });
  check('başka tedarikçi bu hakedişi göremez (404)', (await api(t.supplier2, 'GET', `/settlements/${stId}`)).status === 404);
  check('iyzico kanalındaki hakediş "ödendi" işaretlenemez', (await api(t.admin, 'POST', `/admin/settlements/${stId}/paid`, { reference: 'EFT123456' })).status === 400);
  check('tedarikçiye "hakediş belgesi" bildirimi', (await api(t.supplier1, 'GET', '/notifications')).body.notifications.some((n: { type: string }) => n.type === 'settlement.created'));
  const prof = await api(t.supplier1, 'GET', '/supplier/payout-profile');
  check('tedarikçi ödeme bilgilerini görür; T.C. kimlik no maskeli', prof.status === 200 && !!prof.body.iban && (prof.body.identityNumberMasked === null || prof.body.identityNumberMasked.includes('*')), prof.body);
  check('üye ödeme bilgisi uç noktasına erişemez (403)', (await api(t.memberA, 'GET', '/supplier/payout-profile')).status === 403);
  const badVkn = await api(t.supplier1, 'PUT', '/supplier/payout-profile', { ...prof.body, subMerchantType: 'LIMITED_OR_JOINT_STOCK_COMPANY', taxNo: '1234567891', identityNumber: '' });
  check('geçersiz vergi no reddedilir', badVkn.status === 400 || badVkn.status === 422, badVkn.body);
  const okProf = await api(t.supplier1, 'PUT', '/supplier/payout-profile', { ...prof.body, identityNumber: '' });
  check('geçerli ödeme bilgileri kaydedilir ve iyzico (test) kaydı korunur', okProf.status === 200 && okProf.body.status.registered === true, okProf.body);

  // ------------------------------------------------------------------
  section('Hesap yönetimi: hesap açma, geçici şifre, ekip, oturum iptali');
  const uniq = Date.now();
  const newEmail = `pilot-${uniq}@ornek.demo`;
  const lead = await api(null, 'POST', '/public/leads', { businessName: `Pilot Kafe ${uniq}`, contactName: 'Pilot Sahip', phone: '0532 000 00 00', email: newEmail, city: 'İstanbul', businessType: 'cafe' });
  check('başvuru alındı', lead.status === 200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadRow = ((await api(t.admin, 'GET', '/admin/leads')).body.leads as any[]).find((l) => l.email === newEmail);
  check('yönetime yeni başvuru bildirimi', (await api(t.admin, 'GET', '/notifications')).body.notifications.some((n: { title: string }) => n.title.includes(`Pilot Kafe ${uniq}`)));
  const acc = await api(t.admin, 'POST', '/admin/organizations', {
    type: 'member',
    name: `Pilot Kafe ${uniq}`,
    businessType: 'cafe',
    city: 'İstanbul',
    owner: { name: 'Pilot Sahip', email: newEmail },
    leadId: leadRow.id,
  });
  check('başvurudan hesap açıldı, geçici şifre döndü', acc.status === 200 && acc.body.temporaryPassword?.length >= 10, acc.body);
  check('aynı başvuru ikinci kez onaylanamaz', (await api(t.admin, 'POST', '/admin/organizations', { type: 'member', name: 'Deneme Firma', businessType: 'cafe', city: 'İstanbul', owner: { name: 'Y Z', email: `x-${uniq}@ornek.demo` }, leadId: leadRow.id })).status === 400);
  check('aynı e-postayla ikinci hesap açılamaz (409)', (await api(t.admin, 'POST', '/admin/organizations', { type: 'supplier', name: 'Deneme Tedarik', city: 'İstanbul', owner: { name: 'Y Z', email: newEmail } })).status === 409);
  const tmpTok = await login(newEmail, acc.body.temporaryPassword);
  check('geçici şifreyle girişte şifre değişimi zorunlu', (await api(tmpTok, 'GET', '/auth/me')).body.user.mustChangePassword === true);
  const blocked = await api(tmpTok, 'GET', '/member/dashboard');
  check('şifre değişmeden uygulama kullanılamaz (403)', blocked.status === 403 && blocked.body.error.code === 'password_change_required');
  check('zayıf yeni şifre reddedilir', (await api(tmpTok, 'POST', '/auth/change-password', { currentPassword: acc.body.temporaryPassword, newPassword: 'kisa' })).status === 422);
  const changed = await api(tmpTok, 'POST', '/auth/change-password', { currentPassword: acc.body.temporaryPassword, newPassword: 'PilotKafe2026' });
  check('şifre değişti, yeni token döndü', changed.status === 200 && !!changed.body.token);
  const ownerTok = changed.body.token as string;
  check('eski token geçersiz (401)', (await api(tmpTok, 'GET', '/member/dashboard')).status === 401);
  check('yeni token ile panel açılır', (await api(ownerTok, 'GET', '/member/dashboard')).status === 200);
  const staffEmail = `calisan-${uniq}@ornek.demo`;
  const staff = await api(ownerTok, 'POST', '/account/team', { name: 'Kasa Çalışanı', email: staffEmail });
  check('hesap sahibi ekibe kişi ekler', staff.status === 200 && !!staff.body.temporaryPassword);
  const staffTok0 = await login(staffEmail, staff.body.temporaryPassword);
  const staffTok = (await api(staffTok0, 'POST', '/auth/change-password', { currentPassword: staff.body.temporaryPassword, newPassword: 'Calisan2026x' })).body.token;
  check('ekip üyesi kişi ekleyemez (403)', (await api(staffTok, 'POST', '/account/team', { name: 'Başka Kişi', email: `b-${uniq}@ornek.demo` })).status === 403);
  check('ekip üyesi sipariş verebilir', (await api(staffTok, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'cash' })).status === 200);
  check('hesap sahibi kişiyi pasifleştirir', (await api(ownerTok, 'PATCH', `/account/team/${staff.body.userId}`, { active: false })).status === 200);
  check('  → pasif kişinin açık oturumu anında düşer', (await api(staffTok, 'GET', '/member/dashboard')).status === 401);
  check('  → pasif kişi giriş yapamaz', (await api(null, 'POST', '/auth/login', { email: staffEmail, password: 'Calisan2026x' })).status === 403);
  check('yönetim kuruluşu pasifleştirir', (await api(t.admin, 'PATCH', `/admin/organizations/${acc.body.orgId}`, { active: false })).status === 200);
  check('  → pasif kuruluşun sahibi engellenir', (await api(ownerTok, 'GET', '/member/dashboard')).status === 403);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('başvuru durumu "hesap açıldı"', ((await api(t.admin, 'GET', '/admin/leads')).body.leads as any[]).find((l) => l.id === leadRow.id)?.status === 'approved');
  check('geçersiz IBAN reddedilir', (await api(t.supplier1, 'PATCH', '/account/profile', { iban: 'TR000000000000000000000000' })).status === 422);
  check('IBAN yalnızca tedarikçide tutulur', (await api(t.memberA, 'PATCH', '/account/profile', { iban: 'TR330006100519786457841326' })).status === 400);

  // ------------------------------------------------------------------
  section('Katalog yönetimi ve yeni teklif');
  const cats = (await api(t.admin, 'GET', '/catalog/categories')).body.categories;
  const newProd = await api(t.admin, 'POST', '/admin/products', { categoryId: cats[0].id, name: `Test Ürünü ${uniq}`, unit: 'kg', packLabel: '1 kg paket', vatRate: 1, marketPrice: 10_000 });
  check('yönetim ürün kartı ekler, SKU otomatik', newProd.status === 200 && /^[A-Z]{2}-\d{3}$/.test(newProd.body.sku), newProd.body);
  check('üye ürün ekleyemez (403)', (await api(t.memberA, 'POST', '/admin/products', {})).status === 403);
  check('piyasa fiyatı güncellenir', (await api(t.admin, 'PATCH', `/admin/products/${newProd.body.id}`, { marketPrice: 12_000 })).status === 200);
  check('kademe taban fiyattan pahalı olamaz', (await api(t.supplier1, 'POST', '/supplier/offers', { productId: newProd.body.id, basePrice: 9_000, stock: 100, tiers: [{ minQty: 10, unitPrice: 9_500 }] })).status === 422);
  const offer = await api(t.supplier1, 'POST', '/supplier/offers', { productId: newProd.body.id, basePrice: 9_000, stock: 100, tiers: [{ minQty: 10, unitPrice: 8_500 }] });
  check('tedarikçi yeni ürüne teklif açar', offer.status === 200);
  check('aynı ürüne ikinci teklif açılamaz (409)', (await api(t.supplier1, 'POST', '/supplier/offers', { productId: newProd.body.id, basePrice: 8_000, stock: 1 })).status === 409);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seen = ((await api(t.memberA, 'GET', `/catalog/products?q=${encodeURIComponent(`Test Ürünü ${uniq}`)}`)).body.products as any[])[0];
  check('üye yeni ürünü ve teklifi katalogda görür', seen?.offers?.length === 1 && seen.marketPrice === 12_000);

  // ------------------------------------------------------------------
  section('Üyelik ödemesi, vadeli borç ödemesi, hesap özeti, kayıtlar');
  const sub = await payWith(t.memberB, { purpose: 'subscription' });
  check('Pro üyelik kartla ödenir', sub.done?.body.status === 'succeeded', sub.done?.body);
  check('  → plan Pro oldu', (await api(t.memberB, 'GET', '/auth/me')).body.user.org.plan === 'pro');
  check('  → Pro üyeye ikinci üyelik ödemesi başlatılamaz', (await api(t.memberB, 'POST', '/payments', { purpose: 'subscription' })).status === 400);
  check('Pro üye 60 gün vade kullanabilir', (await api(t.memberB, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'net60' })).status === 200);
  const due = ((await api(t.memberB, 'GET', '/member/account')).body.dueOrders as { id: string }[])[0];
  const duePay = await payWith(t.memberB, { purpose: 'due', orderId: due.id });
  check('vadeli borç kartla ödenir', duePay.done?.body.status === 'succeeded' && (await getOrder(t.memberB, due.id)).paymentStatus === 'paid');
  check('ödenmiş borç için tekrar ödeme başlatılamaz', (await api(t.memberB, 'POST', '/payments', { purpose: 'due', orderId: due.id })).status === 400);
  const month = new Date().toISOString().slice(0, 7);
  const st = (await api(t.memberA, 'GET', `/member/statements/${month}`)).body.statement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check('aylık hesap özeti: KDV dağılımı toplamı = KDV toplamı', sum(st.vatByRate.map((v: any) => v.vat)) === st.totals.vat && st.orders.length > 0, st.totals);
  check('hatalı ay biçimi reddedilir', (await api(t.memberA, 'GET', '/member/statements/2026-13')).status === 400);
  const auditPairs: [string, string][] = [
    ['order.create', 'order'],
    ['payment.succeeded', 'payment'],
    ['wave.close', 'wave'],
    ['settlement.create', 'settlement'],
    ['refund.succeeded', 'refund'],
    ['org.create', 'organization'],
    ['auth.password_change', 'user'],
    ['user.deactivate', 'user'],
    ['product.create', 'product'],
    ['issue.resolved', 'issue'],
  ];
  for (const [action, entity] of auditPairs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = (await api(t.admin, 'GET', `/admin/audit?entity=${entity}`)).body.logs as any[];
    check(`işlem kaydında "${action}" var`, logs.some((l) => l.action === action));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outbox = (await api(t.admin, 'GET', '/admin/outbox')).body.messages as any[];
  check('hoş geldin e-postası kuyrukta ve içeriği yönetimden gizli', outbox.some((m) => m.recipient === newEmail && m.body === null));
  const notes = await api(t.memberA, 'GET', '/notifications');
  check('bildirimler okundu işaretlenir', (await api(t.memberA, 'POST', '/notifications/read', {})).status === 200 && (await api(t.memberA, 'GET', '/notifications')).body.unread === 0 && notes.body.notifications.length > 0);

  // ------------------------------------------------------------------
  section('Zamanlanmış işler ve şifre sıfırlama (PostgreSQL)');
  if (pg && process.env.CRON_SECRET) {
    const cron = () => fetch(`${BASE}/api/v1/cron/maintenance`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }).then((r) => r.json());
    check('cron uç noktası anahtarsız 401', (await fetch(`${BASE}/api/v1/cron/maintenance`)).status === 401);
    const nw = await api(t.admin, 'POST', '/admin/waves', { title: 'Test Dalgası', region: 'İstanbul', cutoffAt: new Date(Date.now() + 3_600_000).toISOString(), deliveryAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    check('yeni dalga açılır', nw.status === 200, nw.body);
    check('aynı bölgede ikinci açık dalga reddedilir', (await api(t.admin, 'POST', '/admin/waves', { title: 'Çakışan', region: 'İstanbul', cutoffAt: new Date(Date.now() + 7_200_000).toISOString(), deliveryAt: new Date(Date.now() + 3 * 86_400_000).toISOString() })).status === 400);
    const wo = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], waveId: nw.body.wave.id, paymentTerm: 'net30' });
    const stale = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 5 }], paymentTerm: 'cash' })).body.order;
    const stockStale = await stockOf(offA.id);
    await pg.query(`update waves set cutoff_at = now() - interval '1 minute' where id = $1`, [nw.body.wave.id]);
    await pg.query(`update orders set due_at = now() - interval '1 day' where id = $1`, [wo.body.order.id]);
    await pg.query(`update orders set created_at = now() - interval '31 minutes' where id = $1`, [stale.id]);
    const m = await cron();
    check('bakım: süresi dolan dalgayı kapattı', m.closedWaves?.some((w: { title: string }) => w.title.includes('Test Dalgası')), m);
    check('bakım: vadesi geçen ödeme "gecikmiş" oldu', (await getOrder(t.memberA, wo.body.order.id)).paymentStatus === 'overdue');
    check('bakım: 30 dakikada ödenmeyen sipariş iptal edildi', m.expiredOrders >= 1 && (await getOrder(t.memberA, stale.id)).status === 'cancelled', m);
    check('  → stok geri döndü', (await stockOf(offA.id)) === stockStale + 5);
    check('bakım: gecikme bildirimi WhatsApp/e-posta kuyruğuna girdi', m.reminders >= 1 && m.outbox.sent >= 1, m);
    const again = await cron();
    check('bakım tekrar çalışınca bir şey bozmaz (idempotent)', again.closedWaves.length === 0 && again.expiredOrders === 0 && again.overdueOrders === 0 && again.refunds.failed === 0, again);

    // Teslim + 48 saat itiraz süresi → tedarikçi ödemesi serbest (pazaryeri ürün onayı)
    const rel = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 2 }], paymentTerm: 'cash' })).body.order;
    await payWith(t.memberA, { purpose: 'order', orderId: rel.id });
    const relItem = rel.items[0].id;
    for (const st of ['confirmed', 'shipped', 'delivered']) await api(t.supplier1, 'PATCH', `/supplier/items/${relItem}`, { status: st });
    await cron();
    check('itiraz süresi dolmadan kalem serbest bırakılmaz', (await pg.query(`select released_at from order_items where id = $1`, [relItem])).rows[0].released_at === null);
    const relDetail = await getOrder(t.memberA, rel.id);
    check('teslimde sorun bildirimi son tarihi gösterilir', !!relDetail.items[0].issueDeadline);
    await pg.query(`update order_items set delivered_at = now() - interval '49 hours' where id = $1`, [relItem]);
    check('48 saatten sonra sorun bildirimi reddedilir', (await api(t.memberA, 'POST', `/orders/${rel.id}/items/${relItem}/issue`, { type: 'damaged', qty: 1 })).status === 400);
    const m2 = await cron();
    const relRow = (await pg.query(`select released_at, charge_amount, commission_amount, commission_vat, supplier_share from order_items where id = $1`, [relItem])).rows[0];
    const relPi = (await pg.query(`select approved_at, price, sub_merchant_price from payment_items where order_item_id = $1`, [relItem])).rows[0];
    check('bakım: itiraz süresi dolan kalem serbest bırakıldı, ürün onayı verildi', m2.releases?.released >= 1 && !!relRow.released_at && !!relPi.approved_at, { m: m2.releases, relRow, relPi });
    check('  → tutarlar donduruldu: pay = tutar − komisyon − komisyon KDV’si', relRow.supplier_share === relRow.charge_amount - relRow.commission_amount - relRow.commission_vat && relRow.supplier_share === relPi.sub_merchant_price, { relRow, relPi });
    check('  → tedarikçi ekranında "ödemesi onaylandı"', ((await api(t.supplier1, 'GET', '/supplier/items')).body.items as { id: string; payoutStatus: string }[]).find((i) => i.id === relItem)?.payoutStatus === 'released');

    // Sonucu belirsiz kalan iade asla otomatik tekrar gönderilmez; yönetim kontrol eder
    const relPiId = (await pg.query(`select id, payment_id from payment_items where order_item_id = $1`, [relItem])).rows[0];
    const stuck = (await pg.query(
      `insert into refunds (id, payment_item_id, payment_id, org_id, order_id, order_item_id, amount, reason, description, status, attempts, processed_at)
       values (gen_random_uuid()::text, $1, $2, $3, $4, $5, 1, 'issue', 'test: belirsiz iade', 'processing', 1, now() - interval '11 minutes') returning id`,
      [relPiId.id, relPiId.payment_id, aOrg, rel.id, relItem],
    )).rows[0].id;
    await cron();
    check('bakım: 10 dakikadır "işleniyor" kalan iade "elle kontrol" durumuna düştü', (await pg.query(`select status from refunds where id = $1`, [stuck])).rows[0].status === 'needs_review');
    const adminRefunds = (await api(t.admin, 'GET', '/admin/refunds')).body.refunds as { id: string; status: string }[];
    check('yönetim kontrol bekleyen iadeyi görür', adminRefunds.some((r) => r.id === stuck && r.status === 'needs_review'));
    check('üye yönetimin iade uç noktasına erişemez (403)', (await api(t.memberA, 'POST', `/admin/refunds/${stuck}`, { action: 'retry' })).status === 403);
    check('notsuz "elle yapıldı" işaretlemesi reddedilir', (await api(t.admin, 'POST', `/admin/refunds/${stuck}`, { action: 'mark_done', note: '' })).status === 422);
    check('yönetim iadeyi yeniden dener', (await api(t.admin, 'POST', `/admin/refunds/${stuck}`, { action: 'retry' })).status === 200);
    let stuckStatus = '';
    for (let i = 0; i < 30 && stuckStatus !== 'succeeded'; i++) {
      stuckStatus = (await pg.query(`select status from refunds where id = $1`, [stuck])).rows[0].status;
      if (stuckStatus !== 'succeeded') await new Promise((r) => setTimeout(r, 200));
    }
    check('  → iade sağlayıcıya gönderildi ve tamamlandı', stuckStatus === 'succeeded', stuckStatus);
    check('  → tamamlanan iade yeniden denenemez', (await api(t.admin, 'POST', `/admin/refunds/${stuck}`, { action: 'retry' })).status === 400);

    const resetEmail = ACC.memberB;
    check('şifre sıfırlama: kayıtlı olmayan adres için de aynı yanıt', (await api(null, 'POST', '/auth/forgot-password', { email: `yok-${uniq}@ornek.demo` })).status === 200);
    check('şifre sıfırlama isteği', (await api(null, 'POST', '/auth/forgot-password', { email: resetEmail })).status === 200);
    const row = await pg.query(`select body from outbox where recipient = $1 and subject = 'Havuz şifre sıfırlama' order by created_at desc limit 1`, [resetEmail]);
    const token = /token=([A-Za-z0-9_-]+)/.exec(row.rows[0]?.body ?? '')?.[1];
    check('sıfırlama bağlantısı e-posta kuyruğunda', !!token);
    const oldTok = t.memberB;
    check('sıfırlama ile yeni şifre belirlenir', (await api(null, 'POST', '/auth/reset-password', { token, newPassword: 'YeniSifre2026' })).status === 200);
    check('  → aynı bağlantı ikinci kez kullanılamaz', (await api(null, 'POST', '/auth/reset-password', { token, newPassword: 'BaskaSifre2026' })).status === 400);
    check('  → eski oturum düştü', (await api(oldTok, 'GET', '/member/dashboard')).status === 401);
    check('  → yeni şifreyle giriş yapılır', (await api(null, 'POST', '/auth/login', { email: resetEmail, password: 'YeniSifre2026' })).status === 200);
    const hashCheck = await pg.query(`select count(*)::int n from password_resets where token_hash = $1`, [token]);
    check('  → veritabanında bağlantının kendisi değil yalnızca özeti (hash) saklanır', hashCheck.rows[0].n === 0);
    const subs = await pg.query(`select count(*)::int n from subscriptions s join users u on u.org_id = s.org_id where u.email = $1 and s.created_at > now() - interval '1 hour'`, [ACC.memberB]);
    check('Pro ödemesi tek abonelik kaydı oluşturdu', subs.rows[0].n === 1, subs.rows[0]);
  } else {
    console.log('  · (DATABASE_URL/CRON_SECRET yok — bu bölüm atlandı)');
  }

  // ------------------------------------------------------------------
  section('Genel değişmezler');
  const members = (await api(t.admin, 'GET', '/admin/members')).body.members as { outstanding: number }[];
  check('hiçbir üyenin açık bakiyesi negatif değil', members.every((m) => m.outstanding >= 0));
  check('üyeye dönen toplam negatif değil', (await returned(t.memberA)) >= 0);
  const supplierItems = (await api(t.supplier1, 'GET', '/supplier/items')).body.items as { id: string }[];
  check('tedarikçi yalnızca kendi kalemlerini görür', supplierItems.length > 0 && ((await api(t.supplier2, 'GET', '/supplier/items')).body.items as { id: string }[]).every((i) => !supplierItems.some((x) => x.id === i.id)));
  if (pg) {
    const neg = await pg.query(`select count(*)::int n from offers where stock < 0`);
    check('veritabanında eksi stoklu teklif yok', neg.rows[0].n === 0);
    const dup = await pg.query(`select count(*)::int n from (select order_item_id from issues group by 1 having count(*) > 1) x`);
    check('veritabanında çift mal kabul bildirimi yok', dup.rows[0].n === 0);
    const orphan = await pg.query(`select count(*)::int n from order_items i join settlements s on s.id = i.settlement_id where i.supplier_id <> s.supplier_id`);
    check('hiçbir kalem başka tedarikçinin hakedişinde değil', orphan.rows[0].n === 0);
    const overRefund = await pg.query(`select count(*)::int n from payment_items pi where (select coalesce(sum(amount), 0) from refunds r where r.payment_item_id = pi.id) > pi.price`);
    check('hiçbir kaleme ödenenden fazla iade yapılmadı', overRefund.rows[0].n === 0);
    const basketSum = await pg.query(`select count(*)::int n from payments p where p.status = 'succeeded' and exists (select 1 from payment_items pi where pi.payment_id = p.id) and p.amount <> (select sum(price) from payment_items pi where pi.payment_id = p.id)`);
    check('her başarılı ödemede kalem toplamı = ödeme tutarı', basketSum.rows[0].n === 0);
    const share = await pg.query(`select count(*)::int n from payment_items where sub_merchant_price is not null and (sub_merchant_price < 0 or sub_merchant_price > price)`);
    check('tedarikçi payı hiçbir kalemde tutarı aşmıyor', share.rows[0].n === 0);
    const paidMismatch = await pg.query(`
      select count(*)::int n from orders o
      where o.payment_status = 'paid' and exists (select 1 from payment_items pi join payments p on p.id = pi.payment_id where p.order_id = o.id and p.status = 'succeeded')
        and (select sum(pi.price) - coalesce((select sum(r.amount) from refunds r join payment_items x on x.id = r.payment_item_id join payments px on px.id = x.payment_id where px.order_id = o.id and px.status = 'succeeded'), 0)
             from payment_items pi join payments p on p.id = pi.payment_id where p.order_id = o.id and p.status = 'succeeded') < 0`);
    check('hiçbir siparişte net tahsilat eksiye düşmedi', paidMismatch.rows[0].n === 0);
    await pg.end();
  }

  console.log(`\n${failures.length ? '✗' : '✓'} ${passed} kontrol geçti, ${failures.length} başarısız`);
  if (failures.length) {
    failures.forEach((f) => console.log('   - ' + f));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('\nDoğrulama çalıştırılamadı:', e);
  process.exit(1);
});
