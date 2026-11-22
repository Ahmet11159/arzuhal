/**
 * Havuz arka uç doğrulama paketi — çalışan bir sunucuya karşı uçtan uca API testleri.
 *
 *   BASE_URL=http://localhost:3100 npm run verify
 *   (DATABASE_URL + CRON_SECRET verilirse zamanlanmış bakım işleri de test edilir)
 *
 * Mobil istemcinin kullanacağı Bearer token yolunu kullanır ve sistem değişmezlerini
 * (para, stok, kredi, dalga iadesi) eşzamanlı istekler altında da kontrol eder.
 * Demo verisi gerektirir: önce `npm run db:reset`.
 */
import { closeWave, computeOrderTotals, resolveTier, type OrderDetailDTO, type OfferDTO, type ProductDTO } from '@havuz/core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const PW = 'havuz123';
const ACC = {
  memberA: 'uye@havuz.app',
  memberB: 'iletisim@yeldegirmeni-firin.demo',
  supplier1: 'tedarikci@havuz.app',
  supplier2: 'satis@kavrulmus-kahve-co.demo',
  admin: 'yonetim@havuz.app',
};

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

interface Res<T = any> { status: number; body: T }
async function api<T = any>(token: string | null, method: string, path: string, body?: unknown, rawBody?: string): Promise<Res<T>> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${BASE}/api/v1${path}`, { method, headers, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, body: json };
}
async function login(email: string) {
  const r = await api(null, 'POST', '/auth/login', { email, password: PW });
  if (r.status !== 200) throw new Error(`Giriş başarısız: ${email} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token as string;
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

async function main() {
  const t = Object.fromEntries(await Promise.all(Object.entries(ACC).map(async ([k, e]) => [k, await login(e)]))) as Record<keyof typeof ACC, string>;

  // ------------------------------------------------------------------
  section('Kimlik doğrulama ve yetki');
  check('oturumsuz istek 401', (await api(null, 'GET', '/member/dashboard')).status === 401);
  check('yanlış şifre 401', (await api(null, 'POST', '/auth/login', { email: ACC.memberA, password: 'yanlis123' })).status === 401);
  check('sahte token 401', (await api('a.b.c', 'GET', '/member/dashboard')).status === 401);
  check('üye → yönetim API 403', (await api(t.memberA, 'GET', '/admin/overview')).status === 403);
  check('tedarikçi → sipariş oluşturma 403', (await api(t.supplier1, 'POST', '/orders', { items: [] })).status === 403);
  check('üye → tedarikçi API 403', (await api(t.memberA, 'GET', '/supplier/items')).status === 403);
  check('bozuk JSON → 4xx (500 değil)', [400, 422].includes((await api(t.memberA, 'POST', '/orders', undefined, '{bozuk')).status));
  check('şema dışı girdi → 422', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: 'x', qty: -3 }] })).status === 422);
  const probe = `kaba-kuvvet-${Date.now()}@ornek.demo`;
  const brute = [];
  for (let i = 0; i < 10; i++) brute.push((await api(null, 'POST', '/auth/login', { email: probe, password: 'yanlis-sifre' })).status);
  check('kaba kuvvet: 8 başarısız denemeden sonra hesap kilitlenir (429)', brute.slice(0, 8).every((x) => x === 401) && brute.slice(8).every((x) => x === 429), brute);
  check('sahte X-Forwarded-For ile kilit atlatılamaz', (await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4' }, body: JSON.stringify({ email: probe, password: 'x12345' }) })).status === 429);
  check('başarılı girişler sayılmaz (kilit diğer hesapları etkilemez)', (await api(null, 'POST', '/auth/login', { email: ACC.memberA, password: PW })).status === 200);
  check('/auth/me Bearer ile çalışır (mobil yolu)', (await api(t.memberA, 'GET', '/auth/me')).body?.user?.email === ACC.memberA);

  // ------------------------------------------------------------------
  const products: ProductDTO[] = (await api(t.memberA, 'GET', '/catalog/products')).body.products;
  const offerIndex = new Map<string, { p: ProductDTO; o: OfferDTO }>();
  for (const p of products) for (const o of p.offers) offerIndex.set(o.id, { p, o });
  const s1Offers = (await api(t.supplier1, 'GET', '/supplier/offers')).body.offers as { id: string; stock: number; basePrice: number }[];
  const stockOf = async (offerId: string) => ((await api(t.supplier1, 'GET', '/supplier/offers')).body.offers as { id: string; stock: number }[]).find((o) => o.id === offerId)!.stock;
  const balance = async (tok: string) => (await api(tok, 'GET', '/member/account')).body.creditBalance as number;
  const outstanding = async (tok: string) => (await api(tok, 'GET', '/member/account')).body.outstanding as number;

  // ------------------------------------------------------------------
  section('Sipariş hesapları (kuruş hassasiyetinde)');
  const offA = s1Offers[0];
  const pA = offerIndex.get(offA.id)!.p;
  const stock0 = await stockOf(offA.id);
  const r1 = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 2 }], paymentTerm: 'net30', useCredit: false });
  check('hemen teslim siparişi oluşur', r1.status === 200, r1.body);
  const o1 = r1.body.order;
  const exp = computeOrderTotals(o1.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, marketPrice: i.marketPrice, vatRate: i.vatRate })), { plan: 'free', term: 'net30' });
  check('birim fiyat = kendi miktarının kademesi', o1.items[0].unitPrice === resolveTier(offerIndex.get(offA.id)!.o, 2).unitPrice);
  check('ara toplam, KDV, vade farkı ve toplam core ile birebir', o1.subtotal === exp.subtotal && o1.vat === exp.vat && o1.financingFee === exp.financingFee && o1.total === exp.total, { o1: [o1.subtotal, o1.vat, o1.financingFee, o1.total], exp });
  check(`KDV oranı ürün kartından (%${pA.vatRate})`, o1.items[0].vatRate === pA.vatRate);
  check('stok sipariş kadar düştü', (await stockOf(offA.id)) === stock0 - 2);
  check('vadeli sipariş "vadesi bekleniyor" ve vade tarihi var', o1.paymentStatus === 'due' && !!o1.dueAt);
  check('üye başka üyenin siparişini göremez (404)', (await api(t.memberB, 'GET', `/orders/${o1.id}`)).status === 404);
  check('tedarikçi kendi kalemi olmayan siparişi göremez (404)', (await api(t.supplier2, 'GET', `/orders/${o1.id}`)).status === 404);
  check('başka tedarikçinin kalemi güncellenemez (404)', (await api(t.supplier2, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'confirmed' })).status === 404);
  check('geçersiz durum geçişi reddedilir (bekliyor → teslim)', (await api(t.supplier1, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'delivered' })).status === 400);
  check('Temel üye 60 gün vade kullanamaz', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'net60' })).status === 400);
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offA.id}`, { stock: 50_000 });
  const big = await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 9_000 }], paymentTerm: 'net30' });
  check('vadeli limit aşımı reddedilir (credit_limit)', big.status === 422 && big.body?.error?.code === 'credit_limit', big.body);
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offA.id}`, { stock: 15_000 });
  const over = await api(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 10_000 }, { offerId: offA.id, qty: 10_000 }], paymentTerm: 'cash' });
  check('aynı teklifin satırları birleştirilir; toplam stoğu aşınca reddedilir', over.status === 400, over.body);
  check('reddedilen sipariş stoğa dokunmaz', (await stockOf(offA.id)) === 15_000);

  // ------------------------------------------------------------------
  section('İptal ve iade');
  const outBefore = await outstanding(t.memberA);
  const stockBeforeCancel = await stockOf(offA.id);
  check('iptal: vadeli siparişte borç düşer', (await api(t.supplier1, 'PATCH', `/supplier/items/${o1.items[0].id}`, { status: 'cancelled' })).status === 200);
  const o1b = (await api<{ order: OrderDetailDTO }>(t.memberA, 'GET', `/orders/${o1.id}`)).body.order;
  check('  → sipariş "iptal edildi" ve toplam 0', o1b.status === 'cancelled' && o1b.total === 0, { status: o1b.status, total: o1b.total });
  check('  → açık bakiye sipariş tutarı kadar azaldı', (await outstanding(t.memberA)) === outBefore - o1.total, { before: outBefore, after: await outstanding(t.memberA), total: o1.total });
  check('  → stok iptal edilen miktar kadar geri eklendi', (await stockOf(offA.id)) === stockBeforeCancel + o1.items[0].qty);
  const bal0 = await balance(t.memberA);
  const paid = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 3 }], paymentTerm: 'cash', useCredit: false })).body.order;
  await api(t.supplier1, 'PATCH', `/supplier/items/${paid.items[0].id}`, { status: 'cancelled' });
  const gross = paid.items[0].qty * paid.items[0].finalUnitPrice + Math.round((paid.items[0].qty * paid.items[0].finalUnitPrice * paid.items[0].vatRate) / 100);
  check('iptal: peşin ödenmiş siparişte KDV dahil tutar krediye iade', (await balance(t.memberA)) === bal0 + gross, { bal0, after: await balance(t.memberA), gross });

  // ------------------------------------------------------------------
  section('Eşzamanlılık: stok yarışı (2 üye, 24 eşzamanlı sipariş, stok 10)');
  const offR = s1Offers[1];
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offR.id}`, { stock: 10 });
  const race = await Promise.all(
    Array.from({ length: 24 }, (_, i) => api(i % 2 ? t.memberA : t.memberB, 'POST', '/orders', { items: [{ offerId: offR.id, qty: 1 }], paymentTerm: 'cash' })),
  );
  const ok = race.filter((r) => r.status === 200).length;
  check('tam olarak 10 sipariş başarılı', ok === 10, race.map((r) => r.status));
  check('kalanlar 400 (stok yok), 500 yok', race.every((r) => r.status === 200 || r.status === 400), race.map((r) => r.status));
  check('stok 0 — asla eksiye düşmedi', (await stockOf(offR.id)) === 0);

  section('Eşzamanlılık: kredi çifte harcama');
  const balStart = await balance(t.memberA);
  await api(t.supplier1, 'PATCH', `/supplier/offers/${offR.id}`, { stock: 1_000 });
  const creditRace = await Promise.all(
    Array.from({ length: 6 }, () => api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offR.id, qty: 4 }], paymentTerm: 'cash', useCredit: true })),
  );
  const applied = sum(creditRace.filter((r) => r.status === 200).map((r) => r.body.order.creditApplied));
  const balEnd = await balance(t.memberA);
  check('kullanılan toplam kredi ≤ başlangıç bakiyesi', applied <= balStart, { applied, balStart });
  check('bakiye = başlangıç − kullanılan (kuruşu kuruşuna), negatif değil', balEnd === balStart - applied && balEnd >= 0, { balStart, applied, balEnd });

  // ------------------------------------------------------------------
  section('Dalga: havuz fiyatı, eşzamanlı kapanış, kademe iadesi');
  const waves = (await api(t.memberA, 'GET', '/waves')).body.waves as { id: string; status: string; cutoffAt: string; totalCredit: number }[];
  const wave = waves.filter((w) => w.status === 'open' && new Date(w.cutoffAt) > new Date()).sort((a, b) => +new Date(a.cutoffAt) - +new Date(b.cutoffAt))[0];
  check('açık dalga var', !!wave);
  // Kademeye yakın bir teklif seç
  const wdet = (await api(t.memberA, 'GET', `/waves/${wave.id}`)).body.wave;
  const target = wdet.offers.find((o: any) => o.next && o.next.remainingQty > 1 && o.pooledQty > 0) ?? wdet.offers.find((o: any) => o.next);
  const tgtOffer = offerIndex.get(target.offerId)!.o;
  const first = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: 1 }], waveId: wave.id, paymentTerm: 'cash' });
  check('dalga siparişi: birim fiyat = havuz + kendi miktarı kademesi', first.status === 200 && first.body.order.items[0].unitPrice === resolveTier(tgtOffer, target.pooledQty + 1).unitPrice, first.body);

  // Kapanışla yarışan siparişler
  const racers = Array.from({ length: 8 }, (_, i) =>
    api(i % 2 ? t.memberA : t.memberB, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: target.next.remainingQty }], waveId: wave.id, paymentTerm: 'cash' }),
  );
  const closeP = (async () => { await new Promise((r) => setTimeout(r, 15)); return api(t.admin, 'POST', `/admin/waves/${wave.id}/close`); })();
  const [closeRes, ...raceRes] = await Promise.all([closeP, ...racers]);
  check('dalga kapatıldı', closeRes.status === 200, closeRes.body);
  check('yarışan siparişler ya kabul ya "dalga kapandı" (500 yok)', raceRes.every((r) => r.status === 200 || r.status === 400), raceRes.map((r) => r.status));
  check('ikinci kapatma reddedilir', (await api(t.admin, 'POST', `/admin/waves/${wave.id}/close`)).status === 400);
  check('kapalı dalgaya sipariş reddedilir', (await api(t.memberA, 'POST', '/orders', { items: [{ offerId: target.offerId, qty: 1 }], waveId: wave.id })).status === 400);

  // Değişmez: tüm dalga kalemlerinin nihai fiyatı, havuz toplamından core.closeWave ile yeniden hesaplananla aynı
  const allOrders = (await api(t.admin, 'GET', '/orders')).body.orders as { id: string; wave: { id: string } | null; waveCredit: number }[];
  const waveOrders = allOrders.filter((o) => o.wave?.id === wave.id);
  const details = await Promise.all(waveOrders.map((o) => api<{ order: OrderDetailDTO }>(t.admin, 'GET', `/orders/${o.id}`).then((r) => r.body.order)));
  const lines = details.flatMap((d) => d.items.filter((i) => i.status !== 'cancelled').map((i) => ({ lineId: i.id, orderId: d.id, memberId: d.member?.id ?? d.id, offerId: i.offerId, qty: i.qty, paidUnitPrice: i.unitPrice, final: i.finalUnitPrice })));
  const offersMap = Object.fromEntries([...new Set(lines.map((l) => l.offerId))].map((id) => [id, offerIndex.get(id)!.o]));
  const recomputed = closeWave(lines, offersMap);
  const mismatched = recomputed.lines.filter((l) => l.finalUnitPrice !== lines.find((x) => x.lineId === l.lineId)!.final);
  check(`${lines.length} dalga kaleminin nihai fiyatı bağımsız yeniden hesapla birebir`, mismatched.length === 0, mismatched.slice(0, 3));
  const closedWave = ((await api(t.admin, 'GET', '/waves')).body.waves as any[]).find((w) => w.id === wave.id);
  check('dalga toplam iadesi = yeniden hesaplanan iade', closedWave.totalCredit === recomputed.totalCredit, { db: closedWave.totalCredit, calc: recomputed.totalCredit });
  check('sipariş bazlı iadelerin toplamı = dalga iadesi', sum(waveOrders.map((o) => o.waveCredit)) === closedWave.totalCredit);
  check('hiçbir kalem ödediğinden pahalıya kapanmadı', lines.every((l) => l.final <= l.paidUnitPrice));

  // ------------------------------------------------------------------
  section('Mal kabul bildirimi');
  const mo = (await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 2 }], paymentTerm: 'cash' })).body.order;
  const it = mo.items[0];
  check('teslim edilmemiş ürüne bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1 })).status === 400);
  for (const st of ['confirmed', 'shipped']) await api(t.supplier1, 'PATCH', `/supplier/items/${it.id}`, { status: st });
  check('üye "teslim aldım" der', (await api(t.memberA, 'POST', `/orders/${mo.id}/receive`)).status === 200);
  check('miktardan fazla bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 99 })).status === 400);
  check('zararlı dosya türü reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1, photo: 'data:text/html;base64,PHNjcmlwdD4=' })).status === 422);
  check('bildirim kaydedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'damaged', qty: 1, note: 'test' })).status === 200);
  check('aynı ürüne ikinci bildirim reddedilir', (await api(t.memberA, 'POST', `/orders/${mo.id}/items/${it.id}/issue`, { type: 'missing', qty: 1 })).status === 400);
  const issue = ((await api(t.admin, 'GET', '/admin/issues')).body.issues as any[]).find((i) => i.orderId === mo.id);
  const balI = await balance(t.memberA);
  const dbl = await Promise.all([1, 2, 3].map(() => api(t.admin, 'PATCH', `/admin/issues/${issue.id}`, { status: 'resolved' })));
  const expectedCredit = Math.round(1 * it.finalUnitPrice * (1 + it.vatRate / 100));
  check('eşzamanlı 3 onaydan yalnızca 1’i geçer', dbl.filter((r) => r.status === 200).length === 1, dbl.map((r) => r.status));
  check('kredi tam bir kez ve KDV dahil yazıldı', (await balance(t.memberA)) === balI + expectedCredit, { balI, now: await balance(t.memberA), expectedCredit });

  // ------------------------------------------------------------------
  section('Üyelik ve ödeme');
  const up = await Promise.all([1, 2].map(() => api(t.memberB, 'POST', '/member/upgrade')));
  check('çift tıklamada Pro geçişi tek kez yapılır', up.filter((r) => r.status === 200).length === 1, up.map((r) => r.status));
  check('Pro üye 60 gün vade kullanabilir', (await api(t.memberB, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], paymentTerm: 'net60' })).status === 200);
  const due = ((await api(t.memberB, 'GET', '/member/account')).body.dueOrders as any[])[0];
  const pay2 = await Promise.all([1, 2].map(() => api(t.memberB, 'POST', `/member/orders/${due.id}/pay`)));
  check('aynı borç iki kez ödenmez', pay2.filter((r) => r.status === 200).length === 1, pay2.map((r) => r.status));

  // ------------------------------------------------------------------
  section('Dalga yönetimi ve zamanlanmış bakım');
  const past = await api(t.admin, 'POST', '/admin/waves', { title: 'Test', region: 'İstanbul', cutoffAt: new Date(Date.now() - 60_000).toISOString(), deliveryAt: new Date(Date.now() + 86_400_000).toISOString() });
  check('geçmiş kapanış tarihli dalga reddedilir', past.status === 400);
  const nw = await api(t.admin, 'POST', '/admin/waves', { title: 'Test Dalgası', region: 'İstanbul', cutoffAt: new Date(Date.now() + 3_600_000).toISOString(), deliveryAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
  check('yeni dalga açılır', nw.status === 200, nw.body);
  const clash = await api(t.admin, 'POST', '/admin/waves', { title: 'Çakışan', region: 'İstanbul', cutoffAt: new Date(Date.now() + 7_200_000).toISOString(), deliveryAt: new Date(Date.now() + 3 * 86_400_000).toISOString() });
  check('aynı bölgede ikinci açık dalga reddedilir', clash.status === 400);
  check('cron uç noktası gizli anahtar olmadan 401', (await fetch(`${BASE}/api/v1/cron/maintenance`)).status === 401);

  if (process.env.DATABASE_URL && process.env.CRON_SECRET) {
    const { Client } = await import('pg');
    const pg = new Client({ connectionString: process.env.DATABASE_URL });
    await pg.connect();
    const wo = await api<{ order: OrderDetailDTO }>(t.memberA, 'POST', '/orders', { items: [{ offerId: offA.id, qty: 1 }], waveId: nw.body.wave.id, paymentTerm: 'net30' });
    check('yeni dalgaya sipariş verilir', wo.status === 200, wo.body);
    await pg.query(`update waves set cutoff_at = now() - interval '1 minute' where id = $1`, [nw.body.wave.id]);
    await pg.query(`update orders set due_at = now() - interval '1 day' where id = $1`, [wo.body.order.id]);
    const m = await fetch(`${BASE}/api/v1/cron/maintenance`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }).then((r) => r.json());
    check('bakım: süresi dolan dalgayı kapattı', m.closedWaves?.some((w: any) => w.title.includes('Test Dalgası')), m);
    check('bakım: vadesi geçen ödeme "gecikmiş" oldu', ((await api(t.memberA, 'GET', `/orders/${wo.body.order.id}`)).body.order.paymentStatus) === 'overdue');
    const again = await fetch(`${BASE}/api/v1/cron/maintenance`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }).then((r) => r.json());
    check('bakım tekrar çalışınca bir şey bozmaz (idempotent)', again.closedWaves?.length === 0, again);
    await pg.end();
  } else {
    console.log('  · (DATABASE_URL/CRON_SECRET yok — zamanlanmış bakım testleri atlandı)');
  }

  // ------------------------------------------------------------------
  section('Genel değişmezler');
  const members = (await api(t.admin, 'GET', '/admin/members')).body.members as any[];
  check('hiçbir üyenin açık bakiyesi negatif değil', members.every((m) => m.outstanding >= 0));
  const accA = (await api(t.memberA, 'GET', '/member/account')).body;
  check('kredi bakiyesi = defter hareketleri toplamı', accA.creditBalance >= 0);
  const supplierItems = (await api(t.supplier1, 'GET', '/supplier/items')).body.items as any[];
  check('tedarikçi yalnızca kendi kalemlerini görür', supplierItems.length > 0 && (await api(t.supplier2, 'GET', '/supplier/items')).body.items.every((i: any) => !supplierItems.some((x) => x.id === i.id)));

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
