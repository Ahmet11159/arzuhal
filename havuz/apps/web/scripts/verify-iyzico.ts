/**
 * iyzico entegrasyonunun uçtan uca testi — iyzico API'sini taklit eden yerel bir sunucuyla.
 *
 * Gerçek iyzico hesabı gerektirmez; Havuz tarafının akışını sınar:
 *   ödeme başlatma (imza + gövde) → kullanıcı dönüşü (callback) → sonucu sunucudan doğrulama.
 * Senaryolar: başarılı, kart reddi, tutarı değiştirilmiş sahte yanıt, aynı dönüşün tekrarı, bilinmeyen token.
 *
 * Çalıştırma: önce uygulamayı şu ortamla başlatın, sonra bu betiği çalıştırın:
 *   PAYMENT_PROVIDER=iyzico IYZICO_API_KEY=test-api-key IYZICO_SECRET_KEY=test-secret-key \
 *   IYZICO_BASE_URL=http://127.0.0.1:3199 APP_URL=http://localhost:3100 npx next start -p 3100
 *   npx tsx scripts/verify-iyzico.ts
 */
import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
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
}
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
      sessions.set(token, { conversationId: json.conversationId, price: json.paidPrice, outcome: nextOutcome });
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
        }),
      );
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
  const products = (await api(tok, 'GET', '/catalog/products')).body.products;
  const offerId = products[0].offers[0].id as string;
  const newOrder = async () => (await api(tok, 'POST', '/orders', { items: [{ offerId, qty: 1 }], paymentTerm: 'cash' })).body.order;
  const orderStatus = async (id: string) => (await api(tok, 'GET', `/orders/${id}`)).body.order.paymentStatus as string;

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
  check('dönüş adresi ve eşleşme kimliği doğru', ib.callbackUrl === 'http://localhost:3100/api/v1/payments/iyzico/callback' && ib.conversationId === start.body.paymentId);
  check('alıcı bilgileri dolu (ad, e-posta, kimlik no, şehir)', !!ib.buyer.name && !!ib.buyer.email && /^\d{11}$/.test(ib.buyer.identityNumber) && !!ib.buyer.city, ib.buyer);
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

  console.log('\n▸ İki deneme de tahsil edilirse (mükerrer ödeme)');
  nextOutcome = 'SUCCESS';
  const o4 = await newOrder();
  const s4a = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o4.id });
  const s4b = await api(tok, 'POST', '/payments', { purpose: 'order', orderId: o4.id });
  const credit0 = (await api(tok, 'GET', '/member/account')).body.creditBalance as number;
  await callback(s4a.body.redirectUrl.split('/pay/')[1]);
  check('yeniden başlatılmış eski denemede çekilen para yok sayılmaz: sipariş ödendi', (await orderStatus(o4.id)) === 'paid');
  await callback(s4b.body.redirectUrl.split('/pay/')[1]);
  const credit1 = (await api(tok, 'GET', '/member/account')).body.creditBalance as number;
  check('ikinci tahsilat kredi bakiyesine iade edildi', credit1 === credit0 + o4.total, { credit0, credit1, total: o4.total });

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
