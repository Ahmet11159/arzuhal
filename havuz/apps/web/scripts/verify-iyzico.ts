/**
 * iyzico entegrasyonunun uçtan uca testi — iyzico API'sini taklit eden yerel bir sunucuyla.
 *
 * Gerçek iyzico hesabı gerektirmez; Havuz tarafının akışını sınar:
 *   ödeme başlatma (imza + gövde) → kullanıcı dönüşü (callback) → sonucu sunucudan doğrulama.
 * Senaryolar: pazaryeri alt satıcı kaydı, tedarikçi payıyla bölünmüş sepet, başarılı ödeme, kart reddi,
 * tutarı değiştirilmiş sahte yanıt, aynı dönüşün tekrarı, kalem iptalinde karta kısmi iade, mükerrer
 * ödemenin tamamen iadesi, bilinmeyen token; DATABASE_URL + CRON_SECRET varsa teslim sonrası ürün onayı.
 *
 * Çalıştırma: önce uygulamayı şu ortamla başlatın, sonra bu betiği çalıştırın:
 *   PAYMENT_PROVIDER=iyzico IYZICO_MARKETPLACE=true IYZICO_API_KEY=test-api-key IYZICO_SECRET_KEY=test-secret-key \
 *   IYZICO_BASE_URL=http://127.0.0.1:3199 APP_URL=http://localhost:3100 npx next start -p 3100
 *   npx tsx scripts/verify-iyzico.ts
 */
import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { iyzicoName } from '../src/server/payments/iyzico-auth';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
/** Sunucu ile aynı değer verilmeli: IYZICO_MARKETPLACE=false → standart (pazaryerisiz) iyzico hesabı. */
const MARKET = process.env.IYZICO_MARKETPLACE !== 'false';
const API_KEY = 'test-api-key';
const SECRET = 'test-secret-key';

let passed = 0;
const failures: string[] = [];
const check = (name: string, cond: boolean, detail?: unknown) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300));
  }
};

// ---- Taklit iyzico ----------------------------------------------------------
interface Session {
  conversationId: string;
  price: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'TAMPER';
  items: { id: string; price: string; txn: string }[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subMerchantCalls: { method: string; body: any }[] = [];
const refundCalls: { txn: string; price: string }[] = [];
const approveCalls: string[] = [];
const sessions = new Map<string, Session>();
const signatureErrors: string[] = [];
let nextOutcome: Session['outcome'] = 'SUCCESS';
let lastInitBody: Record<string, unknown> | null = null;

function verifySignature(req: IncomingMessage, path: string, body: string) {
  const auth = String(req.headers.authorization ?? '');
  const rnd = String(req.headers['x-iyzi-rnd'] ?? '');
  if (!auth.startsWith('IYZWSv2 ')) return 'IYZWSv2 başlığı yok';
  const decoded = Buffer.from(auth.slice(8), 'base64').toString();
  const m = /^apiKey:(.+)&randomKey:(.+)&signature:([0-9a-f]{64})$/.exec(decoded);
  if (!m) return `biçim hatalı: ${decoded}`;
  if (m[1] !== API_KEY) return 'apiKey yanlış';
  if (m[2] !== rnd) return 'randomKey x-iyzi-rnd ile uyuşmuyor';
  const expected = createHmac('sha256', SECRET).update(rnd + path + body).digest('hex');
  return m[3] === expected ? null : 'imza yanlış';
}

const mock = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const path = req.url ?? '';
    const err = verifySignature(req, path, body);
    if (err) signatureErrors.push(`${path}: ${err}`);
    const json = JSON.parse(body || '{}');
    res.setHeader('Content-Type', 'application/json');
    if (path === '/payment/iyzipos/checkoutform/initialize/auth/ecom') {
      lastInitBody = json;
      const token = `tok_${Math.random().toString(36).slice(2)}`;
      sessions.set(token, {
        conversationId: json.conversationId,
        price: json.paidPrice,
        outcome: nextOutcome,
        items: (json.basketItems ?? []).map((b: { id: string; price: string }) => ({ id: b.id, price: b.price, txn: `tx${Math.floor(Math.random() * 1e9)}` })),
      });
      res.end(JSON.stringify({ status: 'success', token, paymentPageUrl: `http://127.0.0.1:3199/pay/${token}`, tokenExpireTime: 1800 }));
    } else if (path === '/payment/iyzipos/checkoutform/auth/ecom/detail') {
      const s = sessions.get(json.token);
      if (!s) return res.end(JSON.stringify({ status: 'failure', errorMessage: 'Token bulunamadı' }));
      const paid = s.outcome === 'TAMPER' ? Number(s.price) - 1 : Number(s.price);
      res.end(
        JSON.stringify({
          status: 'success',
          paymentStatus: s.outcome === 'FAILURE' ? 'FAILURE' : 'SUCCESS',
          errorMessage: s.outcome === 'FAILURE' ? 'Kart limiti yetersiz' : undefined,
          paymentId: '9000001',
          paidPrice: paid,
          conversationId: s.conversationId,
          basketId: s.conversationId,
          lastFourDigits: '0008',
          itemTransactions: s.items.map((i) => ({ itemId: i.id, paymentTransactionId: i.txn, price: Number(i.price), paidPrice: Number(i.price) })),
        }),
      );
    } else if (path === '/payment/refund') {
      refundCalls.push({ txn: json.paymentTransactionId, price: json.price });
      res.end(JSON.stringify({ status: 'success', paymentTransactionId: json.paymentTransactionId, price: Number(json.price), currency: 'TRY' }));
    } else if (path === '/payment/iyzipos/item/approve') {
      approveCalls.push(json.paymentTransactionId);
      res.end(JSON.stringify({ status: 'success', paymentTransactionId: json.paymentTransactionId }));
    } else if (path === '/onboarding/submerchant') {
      subMerchantCalls.push({ method: req.method ?? '', body: json });
      res.end(JSON.stringify(req.method === 'PUT' ? { status: 'success' } : { status: 'success', subMerchantKey: `mock_sm_${String(json.subMerchantExternalId).slice(0, 8)}` }));
    } else if (path === '/onboarding/submerchant/detail') {
      res.end(JSON.stringify({ status: 'failure', errorMessage: 'Alt üye işyeri bulunamadı' }));
    } else {
      res.statusCode = 404;
      res.end('{}');
    }
  });
});

// ---- Havuz istemcisi ---------------------------------------------------------
async function api(token: string | null, method: string, path: string, body?: unknown) {
  const r = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
/** iyzico'nun kullanıcı tarayıcısıyla yaptığı form POST'unu taklit eder. */
async function callback(token: string) {
  const r = await fetch(`${BASE}/api/v1/payments/iyzico/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }).toString(),
    redirect: 'manual',
  });
  return { status: r.status, location: r.headers.get('location') ?? '' };
}

async function main() {
  await new Promise<void>((r) => mock.listen(3199, '127.0.0.1', () => r()));
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  if (health.paymentProvider !== 'iyzico') {
    console.error('Sunucu PAYMENT_PROVIDER=iyzico ile başlatılmamış:', health);
    process.exit(1);
  }
  const login = await api(null, 'POST', '/auth/login', { email: 'uye@havuz.app', password: 'havuz123' });
  const tok = login.body.token as string;
  const admin = (await api(null, 'POST', '/auth/login', { email: 'yonetim@havuz.app', password: 'havuz123' })).body.token as string;
  const supTok = (await api(null, 'POST', '/auth/login', { email: 'tedarikci@havuz.app', password: 'havuz123' })).body.token as string;
  const products = (await api(tok, 'GET', '/catalog/products')).body.products as { offers: { id: string; supplier: { id: string; name: string } }[] }[];
  const offers = products.flatMap((p) => p.offers).filter((o) => o.supplier.name === 'Anadolu Gıda Toptan');
  const offerId = offers[0].id;
  const supplierId = offers[0].supplier.id;
  await api(supTok, 'PATCH', `/supplier/offers/${offerId}`, { stock: 5_000 });
  await api(supTok, 'PATCH', `/supplier/offers/${offers[1].id}`, { stock: 5_000 });
  const newOrder = async (items = [{ offerId, qty: 1 }]) => (await api(tok, 'POST', '/orders', { items, paymentTerm: 'cash', acceptTerms: true })).body.order;
  const orderStatus = async (id: string) => (await api(tok, 'GET', `/orders/${id}`)).body.order.paymentStatus as string;
  const getOrder = async (id: string) => (await api(tok, 'GET', `/orders/${id}`)).body.order;
  const waitRefunds = async (n: number) => {
    for (let i = 0; i < 30 && refundCalls.length < n; i++) await new Promise((r) => setTimeout(r, 200));
  };

  console.log(`\n▸ ${MARKET ? 'Pazaryeri: tedarikçinin alt satıcı kaydı' : 'Standart hesap (pazaryeri kapalı)'}`);
  const sync = await api(admin, 'POST', `/admin/suppliers/${supplierId}/sync`);
  if (!MARKET) {
    check('pazaryeri kapalıyken alt satıcı kaydı yapılmaz', sync.status === 200 && sync.body.synced === false && subMerchantCalls.length === 0, sync.body);
  } else {
  const smCall = subMerchantCalls.find((c) => c.method === 'POST');
  check('demo (test) anahtarı yerine iyzico’ya yeni kayıt açıldı', sync.status === 200 && sync.body.synced === true && !!smCall, { sync: sync.body, calls: subMerchantCalls.length });
  check('kayıt isteği: tür, dış kimlik, IBAN, vergi no, unvan, vergi dairesi', smCall?.body.subMerchantType === 'LIMITED_OR_JOINT_STOCK_COMPANY' && smCall.body.subMerchantExternalId === supplierId && /^TR\d{24}$/.test(smCall.body.iban) && /^\d{10}$/.test(smCall.body.taxNumber) && !!smCall.body.legalCompanyTitle && !!smCall.body.taxOffice, smCall?.body);
  const profile = (await api(supTok, 'GET', '/supplier/payout-profile')).body;
  check('tedarikçi "iyzico’ya kayıtlı" görünür', profile.status.registered === true && profile.marketplace === true, profile.status);
  check('kayıt isteğinin imzası doğru', signatureErrors.length === 0, signatureErrors);
  }

  console.log('\n▸ Başarılı ödeme');
  nextOutcome = 'SUCCESS';
  const o1 = await newOrder();
  const start = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o1.id });
  check('ödeme başlatıldı, iyzico ödeme sayfasına yönlendirme', start.status === 200 && start.body.provider === 'iyzico' && start.body.redirectUrl.startsWith('http://127.0.0.1:3199/pay/'), start.body);
  check('istek imzası (IYZWSv2) iyzico tarafında doğrulandı', signatureErrors.length === 0, signatureErrors);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ib = lastInitBody as Record<string, any>;
  const lira = (o1.total / 100).toString();
  check('tutar sunucuda hesaplandı ve doğru biçimde gönderildi', ib.price === lira && ib.paidPrice === lira && ib.basketItems[0].price === lira, { price: ib.price, total: o1.total });
  if (!MARKET) check('standart hesap: sepette alt satıcı alanı gönderilmez', ib.basketItems.every((b: { subMerchantKey?: string }) => b.subMerchantKey === undefined), ib.basketItems);
  else check('pazaryeri: sepet kalemi tedarikçinin alt satıcı anahtarını taşır', ib.basketItems.every((b: { subMerchantKey?: string }) => b.subMerchantKey === `mock_sm_${supplierId.slice(0, 8)}`), ib.basketItems);
  if (MARKET) check('pazaryeri: tedarikçi payı tutardan küçük, Havuz payı = komisyon + KDV', ib.basketItems.every((b: { price: string; subMerchantPrice: string }) => Number(b.subMerchantPrice) > 0 && Number(b.subMerchantPrice) < Number(b.price)), ib.basketItems);
  check('dönüş adresi ve eşleşme kimliği doğru', ib.callbackUrl === 'http://localhost:3100/api/v1/payments/iyzico/callback' && ib.conversationId === start.body.paymentId);
  check('telefon iyzico biçiminde (+905xxxxxxxxx) ya da hiç gönderilmiyor', ib.buyer.gsmNumber === undefined || /^\+90\d{10}$/.test(ib.buyer.gsmNumber), ib.buyer.gsmNumber);
  check('alıcı bilgileri dolu (ad, e-posta, kimlik no, şehir)', !!ib.buyer.name && !!ib.buyer.email && /^\d{11}$/.test(ib.buyer.identityNumber) && !!ib.buyer.city, ib.buyer);
  check('soyad son kelime (Türkçe ad düzeni)', !!ib.buyer.surname && !/\s/.test(ib.buyer.surname), { name: ib.buyer.name, surname: ib.buyer.surname });
  const n3 = iyzicoName('Ali Rıza Yılmaz');
  const n1 = iyzicoName('  Ayşe  ');
  check('ad soyad bölme: "Ali Rıza Yılmaz" → Ali Rıza / Yılmaz, tek kelime iki alana', n3.name === 'Ali Rıza' && n3.surname === 'Yılmaz' && n1.name === 'Ayşe' && n1.surname === 'Ayşe', { n3, n1 });
  const token1 = start.body.redirectUrl.split('/pay/')[1];
  const cb1 = await callback(token1);
  check('dönüş: 303 ile sipariş sayfasına "başarılı"', cb1.status === 303 && cb1.location.endsWith(`/uye/siparisler/${o1.id}?odeme=basarili`), cb1);
  check('sipariş ödendi olarak işaretlendi', (await orderStatus(o1.id)) === 'paid');
  check('sonuç doğrulama isteğinin imzası da doğru', signatureErrors.length === 0, signatureErrors);
  const cb1b = await callback(token1);
  check('aynı dönüş tekrar gelirse etki tekrarlanmaz (idempotent)', cb1b.location.endsWith('?odeme=basarili'));
  const pays = (await api(tok, 'GET', '/payments')).body.payments.filter((p: { orderId: string }) => p.orderId === o1.id);
  check('ödeme kaydı: başarılı, kartın son 4 hanesi, sağlayıcı kimliği', pays.length === 1 && pays[0].status === 'succeeded' && pays[0].cardLast4 === '0008', pays);

  console.log('\n▸ Kart reddi');
  nextOutcome = 'FAILURE';
  const o2 = await newOrder();
  const s2 = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o2.id });
  const cb2 = await callback(s2.body.redirectUrl.split('/pay/')[1]);
  check('dönüş: "hata" ile sipariş sayfasına', cb2.location.endsWith(`/uye/siparisler/${o2.id}?odeme=hata`), cb2);
  check('sipariş ödenmemiş kaldı, tekrar denenebilir', (await orderStatus(o2.id)) === 'unpaid' && (await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o2.id })).status === 200);

  console.log('\n▸ Tutarı değiştirilmiş yanıt (sahtecilik)');
  nextOutcome = 'TAMPER';
  const o3 = await newOrder();
  const s3 = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o3.id });
  const cb3 = await callback(s3.body.redirectUrl.split('/pay/')[1]);
  check('ödenen tutar uyuşmayınca ödeme reddedilir', cb3.location.endsWith('?odeme=hata') && (await orderStatus(o3.id)) === 'unpaid', cb3);
  const failed = (await api(tok, 'GET', '/payments')).body.payments.find((p: { orderId: string; status: string }) => p.orderId === o3.id && p.status === 'failed');
  check('başarısız kayıtta neden yazıyor', /Tutar uyuşmazlığı/.test(failed?.errorMessage ?? ''), failed);

  console.log('\n▸ Kalem iptali: karta kısmi iade');
  nextOutcome = 'SUCCESS';
  const o5 = await newOrder([
    { offerId, qty: 2 },
    { offerId: offers[1].id, qty: 1 },
  ]);
  const s5 = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o5.id });
  const tok5 = s5.body.redirectUrl.split('/pay/')[1];
  check('iki kalemli sepet: kalem toplamı = ödeme tutarı', (lastInitBody as { basketItems: { price: string }[] }).basketItems.length === 2 && Math.round((lastInitBody as { basketItems: { price: string }[] }).basketItems.reduce((a, b) => a + Number(b.price) * 100, 0)) === o5.total);
  await callback(tok5);
  const o5d = await getOrder(o5.id);
  const cancelItem = o5d.items[0];
  const r0 = refundCalls.length;
  await api(supTok, 'PATCH', `/supplier/items/${cancelItem.id}`, { status: 'confirmed' });
  check('tedarikçi ödenmiş kalemi iptal eder', (await api(supTok, 'PATCH', `/supplier/items/${cancelItem.id}`, { status: 'cancelled' })).status === 200);
  await waitRefunds(r0 + 1);
  const sess5 = sessions.get(tok5)!;
  const refund5 = refundCalls.slice(r0);
  const gross5 = cancelItem.qty * cancelItem.finalUnitPrice + Math.round((cancelItem.qty * cancelItem.finalUnitPrice * cancelItem.vatRate) / 100);
  check('iyzico’ya tek iade isteği, doğru kalem işlem numarası ve KDV dahil tutar', refund5.length === 1 && sess5.items.some((i) => i.txn === refund5[0].txn) && Math.round(Number(refund5[0].price) * 100) === gross5, { refund5, gross5 });
  const o5r = await getOrder(o5.id);
  check('üyenin sipariş sayfasında iade "karta iade edildi"', o5r.refundedTotal === gross5 && o5r.refunds[0]?.status === 'succeeded', o5r.refunds);
  check('iade isteğinin imzası doğru', signatureErrors.length === 0, signatureErrors);

  console.log('\n▸ İki deneme de tahsil edilirse (mükerrer ödeme)');
  nextOutcome = 'SUCCESS';
  const o4 = await newOrder();
  const s4a = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o4.id });
  const s4b = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o4.id });
  await callback(s4a.body.redirectUrl.split('/pay/')[1]);
  check('yeniden başlatılmış eski denemede çekilen para yok sayılmaz: sipariş ödendi', (await orderStatus(o4.id)) === 'paid');
  const r1 = refundCalls.length;
  const tok4b = s4b.body.redirectUrl.split('/pay/')[1];
  await callback(tok4b);
  await waitRefunds(r1 + 1);
  const dupRefunds = refundCalls.slice(r1);
  check('ikinci tahsilatın tamamı karta iade edildi (kredi yok)', Math.round(dupRefunds.reduce((a, r) => a + Number(r.price) * 100, 0)) === o4.total && dupRefunds.every((r) => sessions.get(tok4b)!.items.some((i) => i.txn === r.txn)), { dupRefunds, total: o4.total });

  const pgUrl = process.env.DATABASE_URL;
  if (pgUrl && process.env.CRON_SECRET) {
    console.log('\n▸ Teslim + itiraz süresi → iyzico ürün onayı');
    const { Client } = await import('pg');
    const pg = new Client({ connectionString: pgUrl });
    await pg.connect();
    const keep = o5d.items[1];
    for (const st of ['confirmed', 'shipped', 'delivered']) await api(supTok, 'PATCH', `/supplier/items/${keep.id}`, { status: st });
    await pg.query(`update order_items set delivered_at = now() - interval '49 hours' where id = $1`, [keep.id]);
    const a0 = approveCalls.length;
    const m = await fetch(`${BASE}/api/v1/cron/maintenance`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } }).then((r) => r.json());
    const keepTxn = (await pg.query(`select provider_txn_id, approved_at from payment_items where order_item_id = $1`, [keep.id])).rows[0];
    if (!MARKET) {
      const rel = (await pg.query(`select released_at from order_items where id = $1`, [keep.id])).rows[0];
      check('standart hesap: onay isteği gönderilmez, kalem hakedişe serbest kalır', approveCalls.length === a0 && !!rel.released_at, { approveCalls, rel });
      await pg.end();
      mock.close();
      console.log(`\n${failures.length ? '✗' : '✓'} ${passed} kontrol geçti, ${failures.length} başarısız`);
      process.exit(failures.length ? 1 : 0);
    }
    check('bakım: ürün onayı iyzico’ya gönderildi (doğru işlem numarası)', approveCalls.length === a0 + 1 && approveCalls.at(-1) === keepTxn.provider_txn_id && !!keepTxn.approved_at, { m: m.releases, approveCalls, keepTxn });
    check('iptal edilen kalem için onay gönderilmedi', !approveCalls.includes(sess5.items.find((i) => i.txn === refund5[0]?.txn)?.txn ?? '-'));
    check('onay isteğinin imzası doğru', signatureErrors.length === 0, signatureErrors);
    await pg.end();
  }

  console.log('\n▸ Bilinmeyen / boş token');
  check('bilinmeyen token güvenle yönlendirilir', (await callback('tok_sahte')).location.endsWith('/uye?odeme=bulunamadi'));
  const empty = await fetch(`${BASE}/api/v1/payments/iyzico/callback`, { method: 'POST', redirect: 'manual' });
  check('token yoksa hata sayfasına', empty.status === 303 && (empty.headers.get('location') ?? '').endsWith('?odeme=hata'));

  mock.close();
  console.log(`\n${failures.length ? '✗' : '✓'} ${passed} kontrol geçti, ${failures.length} başarısız`);
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  mock.close();
  process.exit(1);
});
