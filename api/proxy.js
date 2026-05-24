const COZE_PAT_TOKEN = process.env.COZE_PAT_TOKEN || process.env.VITE_COZE_TOKEN || 'pat_v9jyB55cV1xXHfIkouplLSqWFjh8bhmupHDtx5o7cg8oct2Fpyp7jwS2lBHOZU3h';
const COZE_CLIENT_ID = process.env.COZE_CLIENT_ID || '13649532017216334435107873770562.app.coze';
const COZE_AUTHORIZE_URL = 'https://www.coze.cn/api/permission/oauth2/authorize';
const COZE_TOKEN_URL = 'https://api.coze.cn/api/permission/oauth2/token';
const COZE_USER_INFO_URL = 'https://api.coze.cn/v1/users/me';
const API_BASE = 'https://api.coze.cn';

let kv = null;
try {
  const { kv: vercelKv } = await import('@vercel/kv');
  kv = vercelKv;
} catch {}

const QUOTA_ANON = 3;
const QUOTA_FREE = 15;
const QUOTA_PRO = 9999;

function getTodayKey() {
  const d = new Date();
  return `quota:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function getUserTier(userId) {
  if (!kv) return 'free';
  try {
    const tier = await kv.get(`tier:${userId}`);
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
    const used = await kv.get(key) || 0;
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
    const used = await kv.incr(key);
    if (used === 1) {
      await kv.expire(key, 86400 * 2);
    }
  } catch {}
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

      if (!uid && COZE_PAT_TOKEN) {
        try {
          const patRes = await fetch(COZE_USER_INFO_URL, {
            headers: { 'Authorization': `Bearer ${COZE_PAT_TOKEN}`, 'Content-Type': 'application/json' },
          });
          const patData = await patRes.json();
          uid = patData?.data?.user_id || patData?.data?.id || patData?.id || '';
        } catch {}
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
      const userId = req.headers['x-user-id'] || 'anonymous';
      const isLoggedIn = req.headers['x-logged-in'] === 'true';
      const quota = await checkQuota(userId, isLoggedIn);
      return res.status(200).json(quota);
    }

    if (action === 'increment' && req.method === 'POST') {
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
