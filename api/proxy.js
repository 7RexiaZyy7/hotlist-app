// Load .env manually (no dotenv dep needed)
try {
  const { readFileSync } = await import('fs');
  const { resolve, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {}

const COZE_PAT_TOKEN = process.env.COZE_PAT_TOKEN || process.env.VITE_COZE_TOKEN || 'pat_v9jyB55cV1xXHfIkouplLSqWFjh8bhmupHDtx5o7cg8oct2Fpyp7jwS2lBHOZU3h';
const COZE_CLIENT_ID = process.env.COZE_CLIENT_ID || '13649532017216334435107873770562.app.coze';
const COZE_AUTHORIZE_URL = 'https://www.coze.cn/api/permission/oauth2/authorize';
const COZE_TOKEN_URL = 'https://api.coze.cn/api/permission/oauth2/token';
const COZE_USER_INFO_URL = 'https://api.coze.cn/v1/users/me';
const API_BASE = 'https://api.coze.cn';

const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID || '1274b488576511f18a6f52540025c377';
const AFDIAN_TOKEN = process.env.AFDIAN_TOKEN || 'UXjhNf7a4Cy9eAtwKpD8VGFdxv3JY5bm';
const AFDIAN_API = 'https://afdian.net/api/open';

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

const KV_TIMEOUT = 3000;
const QUOTA_ANON = 3;
const QUOTA_FREE = 15;
const QUOTA_PRO = 9999;

function getTodayKey() {
  const d = new Date();
  return `quota:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function kvWithTimeout(promise, ms = KV_TIMEOUT) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('KV timeout')), ms)),
  ]);
}

async function getUserTier(userId) {
  if (!kv) return 'free';
  try {
    const tier = await kvWithTimeout(kv.get(`tier:${userId}`));
    return tier || 'free';
  } catch {
    return 'free';
  }
}

async function checkQuota(userId, isLoggedIn) {
  const tier = isLoggedIn ? await getUserTier(userId) : 'anon';
  const limit = tier === 'pro' ? QUOTA_PRO : tier === 'free' ? QUOTA_FREE : QUOTA_ANON;

  if (!kv) {
    return { allowed: true, used: 0, limit, tier, remaining: limit };
  }

  const key = `${getTodayKey()}:${userId}`;
  try {
    const used = await kvWithTimeout(kv.get(key)) || 0;
    const remaining = Math.max(0, limit - used);
    return { allowed: used < limit, used, limit, tier, remaining };
  } catch {
    return { allowed: true, used: 0, limit, tier, remaining: limit };
  }
}

async function incrementQuota(userId) {
  if (!kv) return;
  const key = `${getTodayKey()}:${userId}`;
  try {
    const used = await kvWithTimeout(kv.incr(key));
    if (used === 1) {
      await kvWithTimeout(kv.expire(key, 86400 * 2));
    }
  } catch (e) {
    console.error('incrementQuota error:', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    const action = req.query.action;
    const cookies = parseCookies(req.headers.cookie);

    // ─── OAuth: 获取 Coze 登录 URL ───
    if (action === 'oauth_authorize' && req.method === 'GET') {
      const redirect_uri = req.query.redirect_uri || `${getOrigin(req)}/auth/callback`;
      const url = `${COZE_AUTHORIZE_URL}?response_type=code&client_id=${COZE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
      return res.json({ url, client_id: COZE_CLIENT_ID, redirect_uri });
    }

    // ─── OAuth: 用 code 换 token ───
    if (action === 'oauth_token' && req.method === 'POST') {
      const { code, code_verifier, redirect_uri } = body;
      if (!code) return res.json({ ok: false, error: 'Missing code', debug: 'no_code' });

      const tokenBody = {
        grant_type: 'authorization_code',
        code,
        client_id: COZE_CLIENT_ID,
        redirect_uri: redirect_uri || `${getOrigin(req)}/auth/callback`,
      };
      if (code_verifier) tokenBody.code_verifier = code_verifier;

      let tokenRes, tokenData, fetchError;
      try {
        tokenRes = await fetch(COZE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' },
          body: JSON.stringify(tokenBody),
        });
        tokenData = await tokenRes.json();
      } catch (e) {
        fetchError = e.message || String(e);
        return res.json({ ok: false, error: 'fetch_failed', debug: fetchError });
      }

      if (tokenData.code || !tokenData.access_token) {
        return res.json({
          ok: false, error: tokenData.msg || 'token_exchange_failed',
          debug: { code: tokenData.code, status: tokenRes?.status, msg: tokenData.msg },
        });
      }

      const { access_token, refresh_token, expires_in } = tokenData;

      let uid = '';
      let userInfoError;
      try {
        const userRes = await fetch(COZE_USER_INFO_URL, {
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        });
        const userData = await userRes.json();
        uid = userData?.data?.user_id || userData?.data?.id || userData?.id || '';
        if (!uid) userInfoError = 'empty_uid:' + JSON.stringify(userData).slice(0, 200);
      } catch (e) {
        userInfoError = e.message || String(e);
      }

      if (!uid) {
        uid = tokenData.user_id || tokenData.open_id || '';
      }

      setTokenCookies(res, access_token, refresh_token, expires_in);
      return res.json({
        ok: true, access_token, uid,
        debug: userInfoError ? { userInfoError } : undefined,
      });
    }

    // ─── OAuth: 刷新 token ───
    if (action === 'oauth_refresh' && req.method === 'POST') {
      const refresh_token = cookies?.coze_refresh_token;
      if (!refresh_token) return res.status(401).json({ error: 'No refresh token' });

      const refreshRes = await fetch(COZE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: COZE_CLIENT_ID,
        }),
      });
      const tokenData = await refreshRes.json();
      if (!refreshRes.ok || tokenData.code) {
        clearTokenCookies(res);
        return res.status(401).json({ error: 'Refresh failed', msg: tokenData.msg, code: tokenData.code });
      }

      const { access_token, refresh_token: new_refresh, expires_in } = tokenData;

      let uid = '';
      try {
        const userRes = await fetch(COZE_USER_INFO_URL, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        });
        const userData = await userRes.json();
        uid = userData?.data?.user_id || userData?.data?.id || userData?.id || '';
      } catch {}

      setTokenCookies(res, access_token, new_refresh || refresh_token, expires_in);
      return res.json({ ok: true, access_token, uid });
    }

    // ─── OAuth: 获取登录状态 ───
    if (action === 'oauth_status' && req.method === 'GET') {
      const access_token = cookies?.coze_access_token;
      if (!access_token) return res.json({ loggedIn: false });

      try {
        const userRes = await fetch(COZE_USER_INFO_URL, {
          headers: { 'Authorization': `Bearer ${access_token}` },
        });
        const userData = await userRes.json();
        if (!userRes.ok || userData.code) {
          // Token expired, try refresh
          const refresh_token = cookies?.coze_refresh_token;
          if (refresh_token) {
            const refreshRes = await fetch(COZE_TOKEN_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: COZE_CLIENT_ID,
              }),
            });
            const tokenData = await refreshRes.json();
            if (refreshRes.ok) {
              const { access_token: new_token, refresh_token: new_refresh, expires_in } = tokenData;
              setTokenCookies(res, new_token, new_refresh || refresh_token, expires_in);
              const userRes2 = await fetch(COZE_USER_INFO_URL, {
                headers: { 'Authorization': `Bearer ${new_token}` },
              });
              const userData2 = await userRes2.json();
              const uid = userData2?.data?.user_id || userData2?.data?.id || userData2?.id || '';
              return res.json({ loggedIn: true, access_token: new_token, uid });
            }
          }
          clearTokenCookies(res);
          return res.json({ loggedIn: false });
        }
        const uid = userData?.data?.user_id || userData?.data?.id || userData?.id || '';
        return res.json({ loggedIn: true, access_token, uid });
      } catch {
        return res.json({ loggedIn: false });
      }
    }

    // ─── OAuth: 登出 ───
    if (action === 'oauth_logout' && req.method === 'POST') {
      clearTokenCookies(res);
      return res.json({ ok: true });
    }

    // ─── 获取当前认证 token（用于前端调用 Coze API）───
    if (action === 'get_token' && req.method === 'GET') {
      const t = cookies?.coze_access_token;
      const access_token = (t && t !== 'undefined' && t.length > 10) ? t : (COZE_PAT_TOKEN || '');
      if (!access_token) return res.status(401).json({ error: 'No token available' });
      return res.json({ access_token });
    }

    // ─── 热榜 ───
    if (action === 'hotboard' && req.method === 'GET') {
      const { type } = req.query;
      if (!type) return res.status(400).json({ error: 'Missing type parameter' });

      // 小红书/脉脉 → tophub.today 爬虫
      const scrapeMap = {
        xiaohongshu: { url: 'https://tophub.today/n/L4MdA5ldxD', name: '小红书' },
        maimai: { url: 'https://tophub.today/n/2me3DQrowj', name: '脉脉' },
      };
      const scrapeTarget = scrapeMap[type];
      if (scrapeTarget) {
        return await handleTophubScrape(type, scrapeTarget, res);
      }

      // 其他平台使用 uapis.cn
      const r = await fetch(`https://uapis.cn/api/v1/misc/hotboard?type=${encodeURIComponent(type)}`);
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ─── 以下端点需要 token ───
    const cookieToken = cookies?.coze_access_token;
    const validCookieToken = cookieToken && cookieToken !== 'undefined' && cookieToken.length > 10 ? cookieToken : '';
    const patFallbackToken = COZE_PAT_TOKEN || validCookieToken || '';

    // Use PAT for all Coze API calls (chat/retrieve/messages); OAuth token lacks plugin permissions for Bot execution
    const cozeHeaders = {
      'Authorization': `Bearer ${COZE_PAT_TOKEN || validCookieToken || ''}`,
      'Content-Type': 'application/json',
    };

    async function cozeFetch(url, options = {}) {
      return fetch(url, { ...options, headers: { ...cozeHeaders, ...options.headers } });
    }

    if (action === 'chat' && req.method === 'POST') {
      const chatRes = await cozeFetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const chatData = await chatRes.json();
      const chatInfo = chatData.data || chatData;
      if (!chatInfo.id || !chatInfo.conversation_id) {
        return res.status(chatRes.status).json(chatData);
      }
      return res.json({ chat_id: chatInfo.id, conversation_id: chatInfo.conversation_id, timeout: true });
    }

    if (action === 'retrieve' && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await cozeFetch(
        `${API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'messages' && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await cozeFetch(
        `${API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'variables' && req.method === 'POST') {
      const { bot_id, user_id, variables } = body;
      const payload = {
        bot_id, user_id, stream: false, auto_save_history: false,
        additional_messages: [{ role: 'user', content: '[系统] 更新用户变量', content_type: 'text' }],
      };
      if (variables) payload.custom_variables = variables;
      const r = await cozeFetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      return res.status(r.status).json({ ok: r.ok, chat_id: data?.data?.id });
    }

    if (action === 'diag' && req.method === 'GET') {
      const hasPat = !!COZE_PAT_TOKEN;
      const patPreview = COZE_PAT_TOKEN ? COZE_PAT_TOKEN.slice(0, 8) + '...' + COZE_PAT_TOKEN.slice(-4) : '';
      return res.json({ hasPat, patPreview });
    }

    if (action === 'debug' && req.method === 'GET') {
      const start = Date.now();
      const testRes = await cozeFetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        body: JSON.stringify({
          bot_id: '7639197902187020297',
          user_id: 'debug_test',
          stream: false,
          auto_save_history: true,
          additional_messages: [{ role: 'user', content: 'ping', content_type: 'text' }],
        }),
      });
      const testData = await testRes.json();
      const chatInfo = testData.data || testData;

      // Poll retrieve until completed or 120s timeout
      let finalRetrieve = null;
      let finalMessages = null;
      const pollStart = Date.now();
      while (Date.now() - pollStart < 30000) {
        await new Promise(r => setTimeout(r, 5000));
        const retRes = await cozeFetch(
          `${API_BASE}/v3/chat/retrieve?chat_id=${chatInfo.id}&conversation_id=${chatInfo.conversation_id}`
        );
        finalRetrieve = await retRes.json();
        const status = finalRetrieve?.data?.status || finalRetrieve?.status || '';
        if (status === 'completed' || status === 'failed') {
          // Also fetch messages
          const msgRes = await cozeFetch(
            `${API_BASE}/v3/chat/message/list?chat_id=${chatInfo.id}&conversation_id=${chatInfo.conversation_id}`
          );
          finalMessages = await msgRes.json();
          break;
        }
      }

      return res.json({
        ok: true,
        chat_raw: testData,
        chat_id: chatInfo.id,
        conversation_id: chatInfo.conversation_id,
        poll_ms: Date.now() - pollStart,
        final_retrieve: finalRetrieve,
        final_messages: finalMessages,
      });
    }

    if (action === 'quota' && req.method === 'GET') {
      try {
        const userId = req.headers['x-user-id'] || 'anonymous';
        const isLoggedIn = req.headers['x-logged-in'] === 'true';
        const quota = await checkQuota(userId, isLoggedIn);
        return res.status(200).json(quota);
      } catch (err) {
        console.error('Quota endpoint error:', err);
        // Fallback to free quota if anything goes wrong
        const isLoggedIn = req.headers['x-logged-in'] === 'true';
        return res.status(200).json({
          allowed: true,
          used: 0,
          limit: isLoggedIn ? 15 : 3,
          tier: isLoggedIn ? 'free' : 'anon',
          remaining: isLoggedIn ? 15 : 3,
        });
      }
    }

    if (action === 'increment' && req.method === 'POST') {
      try {
        const userId = req.headers['x-user-id'] || 'anonymous';
        const isLoggedIn = req.headers['x-logged-in'] === 'true';
        const quota = await checkQuota(userId, isLoggedIn);
        if (!quota.allowed) {
          return res.status(429).json({ error: '配额已用完', ...quota });
        }
        await incrementQuota(userId);
        quota.used += 1;
        quota.remaining = Math.max(0, quota.remaining - 1);
        return res.status(200).json(quota);
      } catch (err) {
        console.error('Increment endpoint error:', err);
        // Fallback: allow the request even if quota tracking fails
        const isLoggedIn = req.headers['x-logged-in'] === 'true';
        return res.status(200).json({
          allowed: true,
          used: 0,
          limit: isLoggedIn ? 15 : 3,
          tier: isLoggedIn ? 'free' : 'anon',
          remaining: isLoggedIn ? 15 : 3,
        });
      }
    }

    if (action === 'afdian_check' && req.method === 'POST') {
      const userId = body.user_id || req.headers['x-user-id'] || '';
      if (!userId) return res.json({ ok: false, error: 'Missing user_id' });

      const upgraded = await syncAfdianOrder(userId);
      const tier = await getUserTier(userId);
      return res.json({ ok: true, upgraded, tier });
    }

    if (action === 'tier_set' && req.method === 'POST') {
      const userId = body.user_id || '';
      const tier = body.tier || 'pro';
      const days = body.days || 31;
      if (!userId) return res.json({ ok: false, error: 'Missing user_id' });
      if (!kv) return res.json({ ok: false, error: 'KV not available' });

      await kvWithTimeout(kv.set(`tier:${userId}`, tier, { ex: days * 86400 }));
      const currentTier = await getUserTier(userId);
      return res.json({ ok: true, user_id: userId, tier: currentTier, expires_in_days: days });
    }

    if (action === 'tier_get' && req.method === 'GET') {
      const userId = req.query.user_id || req.headers['x-user-id'] || '';
      if (!userId) return res.json({ ok: false, error: 'Missing user_id' });
      const tier = await getUserTier(userId);
      return res.json({ ok: true, user_id: userId, tier });
    }

    // ─── 知乎搜索（开放平台 API）───
    if (action === 'zhihu_search' && req.method === 'GET') {
      const keyword = req.query.keyword;
      const count = Math.min(parseInt(req.query.count || '10'), 20);
      const offset = parseInt(req.query.offset || '0');
      if (!keyword) return res.status(400).json({ error: 'Missing keyword' });

      const ZHIHU_API_TOKEN = process.env.ZHIHU_API_TOKEN || '';
      if (!ZHIHU_API_TOKEN) return res.status(400).json({ error: 'ZHIHU_API_TOKEN 未配置，请在 Vercel 环境变量中设置' });

      const timestamp = Math.floor(Date.now() / 1000);
      const zhihuUrl = `https://developer.zhihu.com/api/v1/content/zhihu_search?Query=${encodeURIComponent(keyword)}&Count=${count}${offset > 0 ? `&Offset=${offset}` : ''}`;
      const r = await fetch(zhihuUrl, {
        headers: {
          'Authorization': `Bearer ${ZHIHU_API_TOKEN}`,
          'X-Request-Timestamp': String(timestamp),
          'Content-Type': 'application/json',
        },
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    // ─── 脉脉搜索（通过 Bing 搜索引擎）───
    if (action === 'maimai_search' && req.method === 'GET') {
      const keyword = req.query.keyword;
      const count = Math.min(parseInt(req.query.count || '10'), 10);
      if (!keyword) return res.status(400).json({ error: 'Missing keyword' });

      try {
        const searchUrl = `https://www.bing.com/search?q=site:maimai.cn+${encodeURIComponent(keyword)}`;
        const r = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const html = await r.text();

        const items = [];
        const resultRegex = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<\/li>/gi;
        let match;

        while ((match = resultRegex.exec(html)) !== null && items.length < count) {
          const li = match[0];
          
          const urlMatch = li.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
          const titleMatch = li.match(/<h2[^>]*>[\s\S]*?<\/h2>/i);
          const snippetMatch = li.match(/<p[^>]*>[\s\S]*?<\/p>/i);

          if (urlMatch && titleMatch) {
            const url = urlMatch[1];
            if (url.includes('maimai.cn')) {
              const title = titleMatch[0].replace(/<[^>]+>/g, '').trim();
              const snippet = snippetMatch ? snippetMatch[0].replace(/<[^>]+>/g, '').trim() : '';
              
              items.push({
                title: title || '脉脉讨论',
                url: url,
                summary: snippet,
                date: new Date().toISOString().split('T')[0],
              });
            }
          }
        }

        return res.json({ items });
      } catch (e) {
        console.error('maimai search error:', e);
        return res.json({ items: [] });
      }
    }

    return res.status(404).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// quota endpoint - separate handler for clarity
export async function quotaHandler(userId, isLoggedIn) {
  return await checkQuota(userId, isLoggedIn);
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function setTokenCookies(res, access_token, refresh_token, expires_in) {
  const age = expires_in || 86400;
  const refreshAge = 30 * 86400;
  const secure = res.req?.headers?.['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  const cookies = [
    `coze_access_token=${access_token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${age}`,
    `coze_refresh_token=${refresh_token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${refreshAge}`,
  ];
  res.setHeader('Set-Cookie', cookies);
}

function clearTokenCookies(res) {
  const secure = res.req?.headers?.['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  const cookies = [
    `coze_access_token=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`,
    `coze_refresh_token=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`,
  ];
  res.setHeader('Set-Cookie', cookies);
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  return `${proto}://${host}`;
}

async function syncAfdianOrder(cozeUserId) {
  if (!kv || !AFDIAN_USER_ID || !AFDIAN_TOKEN) return false;

  const cacheKey = `afdian_sync:${cozeUserId}`;
  const lastSync = await kvWithTimeout(kv.get(cacheKey));
  if (lastSync && Date.now() - Number(lastSync) < 60000) return false;

  try {
    const ts = Math.floor(Date.now() / 1000);
    const params = JSON.stringify({ page: 1 });
    const signStr = `${AFDIAN_TOKEN}params${params}ts${ts}user_id${AFDIAN_USER_ID}`;

    const crypto = await import('crypto');
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    const r = await fetch(`${AFDIAN_API}/query-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: AFDIAN_USER_ID, params, ts, sign }),
    });
    const data = await r.json();

    if (data.ec !== 200) {
      console.error('Afdian API error:', data);
      return false;
    }

    const orders = data.data?.list || [];
    let upgraded = false;

    for (const order of orders) {
      if (order.status !== 2) continue;

      const customId = (order.custom_order_id || '').trim();
      const remark = (order.remark || '').trim();
      const possibleIds = [customId, remark].filter(Boolean);

      if (possibleIds.some(id => id === cozeUserId || id.includes(cozeUserId))) {
        const currentTier = await kvWithTimeout(kv.get(`tier:${cozeUserId}`));
        if (currentTier !== 'pro') {
          const month = order.month || 1;
          const expireDays = month * 31;
          await kvWithTimeout(kv.set(`tier:${cozeUserId}`, 'pro', { ex: expireDays * 86400 }));
          console.log(`Afdian sync: upgraded ${cozeUserId} to pro, expires in ${expireDays} days`);
          upgraded = true;
        }
        break;
      }
    }

    await kvWithTimeout(kv.set(cacheKey, String(Date.now()), { ex: 120 }));
    return upgraded;
  } catch (e) {
    console.error('syncAfdianOrder error:', e.message);
    return false;
  }
}

// ─── Tophub 爬虫 ───

async function handleTophubScrape(type, target, res) {
  const todayStr = getDateStr();
  const cacheKey = `hotboard:scrape:${type}:${todayStr}`;

  if (kv) {
    try {
      const cached = await kvWithTimeout(kv.get(cacheKey));
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return res.json({
          type,
          source: 'cached',
          update_time: new Date().toLocaleString('zh-CN'),
          list: cached,
        });
      }
    } catch {}
  }

  const r = await fetch(target.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  const html = await r.text();
  const rawItems = parseTophubItems(html);

  const list = rawItems.map((item, i) => ({
    index: i + 1,
    title: item.title,
    url: item.url,
    hot_value: String(item.heatScore),
    extra: {},
  }));

  if (kv && list.length > 0) {
    const now = Date.now();
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now) / 1000);
    if (ttl > 0) {
      await kvWithTimeout(kv.set(cacheKey, list, { ex: ttl }));
    }
  }

  return res.json({
    type,
    source: 'real_api',
    update_time: new Date().toLocaleString('zh-CN'),
    list,
  });
}

function getDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseTophubItems(html) {
  const items = [];
  const trRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const tr = trMatch[0];
    const rankMatch = tr.match(/<td[^>]*>\s*(\d+)\.\s*<\/td>/i);
    if (!rankMatch) continue;

    const linkMatch = tr.match(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const rank = parseInt(rankMatch[1]);
    const url = linkMatch[1].trim();
    const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    if (!title) continue;

    const tds = tr.split('</td>');
    let heatRaw = '';
    for (let i = 0; i < tds.length; i++) {
      const cellContent = tds[i].replace(/<td[^>]*>/g, '').replace(/<[^>]+>/g, '').trim();
      if (cellContent && !cellContent.match(/^\d+\.$/) && cellContent !== title && !cellContent.includes('')) {
        heatRaw = cellContent;
      }
    }

    items.push({
      rank,
      title,
      url: url.startsWith('http') ? url : `https://tophub.today${url.startsWith('/') ? '' : '/'}${url}`,
      heatScore: parseHeat(heatRaw),
    });
  }

  items.sort((a, b) => a.rank - b.rank);
  return items.slice(0, 30);
}

function parseHeat(raw) {
  if (!raw) return 0;
  const s = raw.trim();
  const wMatch = s.match(/^([\d.]+)\s*w/i);
  if (wMatch) return Math.round(parseFloat(wMatch[1]) * 10000);
  const wanMatch = s.match(/^([\d.]+)\s*万/);
  if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
  const numMatch = s.match(/^(\d{1,9}(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}


