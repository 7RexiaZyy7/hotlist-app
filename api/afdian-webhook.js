import { createVerify } from 'crypto';

const AFDIAN_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwwdaCg1Bt+UKZKs0R54y
lYnuANma49IpgoOwNmk3a0rhg/PQuhUJ0EOZSowIC44l0K3+fqGns3Ygi4AfmEfS
4EKbdk1ahSxu7Zkp2rHMt+R9GarQFQkwSS/5x1dYiHNVMiR8oIXDgjmvxuNes2Cr
8fw9dEF0xNBKdkKgG2qAawcN1nZrdyaKWtPVT9m2Hl0ddOO9thZmVLFOb9NVzgYf
jEgI+KWX6aY19Ka/ghv/L4t1IXmz9pctablN5S0CRWpJW3Cn0k6zSXgjVdKm4uN7
jRlgSRaf/Ind46vMCm3N2sgwxu/g3bnooW+db0iLo13zzuvyn727Q3UDQ0MmZcEW
MQIDAQAB
-----END PUBLIC KEY-----`;

let kv = null;
try {
  const { Redis } = await import('@upstash/redis');
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kv = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
} catch {}

function verifyAfdianSign(order, sign) {
  try {
    const signStr = `${order.out_trade_no}${order.user_id}${order.plan_id}${order.total_amount}`;
    const verify = createVerify('SHA256');
    verify.update(signStr);
    return verify.verify(AFDIAN_PUBLIC_KEY, Buffer.from(sign, 'base64'));
  } catch (e) {
    console.error('verifySign error:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ec: 405, em: 'Method not allowed' });

  try {
    let body = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (body += chunk));
      req.on('end', resolve);
    });

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.json({ ec: 400, em: 'Invalid JSON' });
    }

    if (data.ec !== 200 || data.data?.type !== 'order') {
      return res.json({ ec: 400, em: 'Invalid payload type' });
    }

    const order = data.data.order;

    if (!order || order.status !== 2) {
      return res.json({ ec: 200, em: 'ignored non-success order' });
    }

    if (data.sign && !verifyAfdianSign(order, data.sign)) {
      console.error('Afdian webhook signature verification failed');
      return res.json({ ec: 400, em: 'Signature verification failed' });
    }

    const cozeUserId = order.custom_order_id || order.remark || '';

    if (!cozeUserId) {
      console.log('Afdian webhook: no custom_order_id or remark, skipping auto-upgrade');
      return res.json({ ec: 200, em: 'no user_id found in order' });
    }

    const userIds = cozeUserId.split(',').map((s) => s.trim()).filter(Boolean);

    if (!kv) {
      console.error('Afdian webhook: KV not available');
      return res.json({ ec: 500, em: 'KV not available' });
    }

    for (const uid of userIds) {
      await kv.set(`tier:${uid}`, 'pro');
      console.log(`Afdian webhook: set tier:pro for user ${uid}`);
    }

    const month = order.month || 1;
    const expireDays = month * 31;
    for (const uid of userIds) {
      await kv.expire(`tier:${uid}`, expireDays * 86400);
    }

    console.log(`Afdian webhook: processed order ${order.out_trade_no}, upgraded ${userIds.length} user(s), expires in ${expireDays} days`);

    return res.json({ ec: 200, em: 'ok' });
  } catch (err) {
    console.error('Afdian webhook error:', err.message);
    return res.json({ ec: 500, em: err.message });
  }
}
