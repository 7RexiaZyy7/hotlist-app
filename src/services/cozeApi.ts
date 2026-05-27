const PROXY_BASE = '/api/proxy';
const COZE_API_BASE = 'https://api.coze.cn';
const BOT_ID = import.meta.env.VITE_COZE_BOT_ID || '7639197902187020297';
const FALLBACK_PAT = 'pat_v9jyB55cV1xXHfIkouplLSqWFjh8bhmupHDtx5o7cg8oct2Fpyp7jwS2lBHOZU3h';

// ─── OAuth PKCE ───

export async function generatePKCEChallenge(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

export async function getOAuthLoginUrl(): Promise<string> {
  const { verifier, challenge } = await generatePKCEChallenge();
  sessionStorage.setItem('coze_code_verifier', verifier);

  const redirectUri = window.location.origin + '/auth/callback';
  const r = await fetch(`${PROXY_BASE}?action=oauth_authorize&redirect_uri=${encodeURIComponent(redirectUri)}`, { method: 'GET' });
  const data = await r.json();
  return `${data.url}&code_challenge=${challenge}&code_challenge_method=S256&state=${Date.now()}`;
}

export async function handleOAuthCallback(code: string): Promise<any> {
  const code_verifier = sessionStorage.getItem('coze_code_verifier') || '';
  sessionStorage.removeItem('coze_code_verifier');

  const r = await fetch(`${PROXY_BASE}?action=oauth_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier, redirect_uri: window.location.origin + '/auth/callback' }),
  });
  return r.json();
}

export async function refreshOAuthToken(): Promise<{ ok: boolean; access_token?: string; uid?: string }> {
  const r = await fetch(`${PROXY_BASE}?action=oauth_refresh`, { method: 'POST' });
  return r.json();
}

export async function getOAuthStatus(): Promise<{ loggedIn: boolean; access_token?: string; uid?: string }> {
  const r = await fetch(`${PROXY_BASE}?action=oauth_status`, { method: 'GET' });
  return r.json();
}

export async function oauthLogout(): Promise<void> {
  await fetch(`${PROXY_BASE}?action=oauth_logout`, { method: 'POST' });
}

export async function getCozeToken(): Promise<string> {
  try {
    const r = await fetch(`${PROXY_BASE}?action=get_token`, { method: 'GET' });
    const data = await r.json();
    if (data.access_token && data.access_token.length > 10) return data.access_token;
  } catch {}
  return FALLBACK_PAT;
}

// ─── API 调用 ───

export async function callCozeChat(query: string): Promise<string> {
  const userId = getUserId();
  const userVariables = getUserVariables();
  console.log('callCozeChat: userId=%s, query=%s', userId, query.slice(0, 50));

  const body: Record<string, any> = {
    bot_id: BOT_ID,
    user_id: userId,
    stream: false,
    auto_save_history: true,
    additional_messages: [
      { role: 'user', content: query, content_type: 'text' },
    ],
  };

  if (userVariables) {
    body.custom_variables = userVariables;
  }

  return await callDirect(body);
}

async function callDirect(body: Record<string, any>): Promise<string> {
  const token = await getCozeToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const chatResponse = await fetch(`${COZE_API_BASE}/v3/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    throw new Error(`Direct API Error: ${chatResponse.status} - ${errorText}`);
  }

  const chatResult = await chatResponse.json();
  console.log('callDirect: raw response', JSON.stringify(chatResult).slice(0, 300));

  const data = chatResult.data || chatResult;

  const chatId = data?.id || data?.chat_id;
  const conversationId = data?.conversation_id;

  if (!chatId || !conversationId) {
    console.error('callDirect: missing id or conversation_id, data=', JSON.stringify(data));
    throw new Error(`Direct API 响应格式错误: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return pollForResult(chatId, conversationId);
}

async function pollForResult(chat_id: string, conversation_id: string): Promise<string> {
  console.log('pollForResult: start chat_id=%s', chat_id);
  const maxRetries = 30;
  const retryInterval = 2000;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));
    if (i % 5 === 0) console.log('pollForResult: iteration %d/%d', i + 1, maxRetries);

    try {
      const token = await getCozeToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const retrieveResponse = await fetch(
        `${COZE_API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers }
      );
      if (!retrieveResponse.ok) continue;

      const retrieveResult = await retrieveResponse.json();
      const retrieveData = retrieveResult.data || retrieveResult;
      const status = retrieveData?.status;

      if (i % 3 === 0) console.log('pollForResult: iter %d, status=%s', i + 1, status || 'unknown');
      if (!status) continue;
      if (status === 'failed') throw new Error('Bot 执行失败');
      if (status !== 'completed') continue;

      console.log('pollForResult: completed, fetching messages');

      const messagesResponse = await fetch(
        `${COZE_API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers }
      );
      if (!messagesResponse.ok) continue;

      const messagesResult = await messagesResponse.json();
      const messages = messagesResult.data || messagesResult;
      if (!Array.isArray(messages)) continue;

      console.log('pollForResult: %d messages, types: %s', messages.length, [...new Set(messages.map((m: any) => m.type || m.role))].join(','));

      const toolResponseMsg = messages.find((m: any) => m.type === 'tool_response');
      if (toolResponseMsg?.content) {
        console.log('pollForResult: returning tool_response content');
        return toolResponseMsg.content;
      }

      const answerMsg = messages.find((m: any) => m.type === 'answer' || m.type === 'final');
      if (answerMsg?.content) {
        console.log('pollForResult: returning answer content');
        return answerMsg.content;
      }

      const assistantMsg = messages.find((m: any) => m.role === 'assistant' && m.type !== 'function_call' && m.type !== 'verbose');
      if (assistantMsg?.content) return assistantMsg.content;

      if (messages.length > 0 && messages[0].content) return messages[0].content;

      return '';
    } catch (e) {
      console.error('pollForResult: iteration %d error:', i + 1, e);
      continue;
    }
  }
  throw new Error('获取响应超时');
}

export async function syncUserVariables(): Promise<boolean> {
  const userId = getUserId();
  const userVariables = getUserVariables();
  if (!userVariables) return false;

  try {
    const token = await getCozeToken();
    const body = {
      bot_id: BOT_ID,
      user_id: userId,
      stream: false, auto_save_history: false,
      additional_messages: [{ role: 'user', content: '[系统] 更新用户变量', content_type: 'text' }],
      custom_variables: userVariables,
    };
    const r = await fetch(`${COZE_API_BASE}/v3/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    const chatInfo = data.data || data;
    return !!(chatInfo?.id);
  } catch {
    return false;
  }
}

// ─── 用户 ID / 变量 ───

export function getUserId(): string {
  const oauthUid = localStorage.getItem('coze_oauth_uid');
  if (oauthUid) return oauthUid;
  let userId = localStorage.getItem('coze_api_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('coze_api_user_id', userId);
  }
  return userId;
}

export function setUserId(uid: string): void {
  localStorage.setItem('coze_oauth_uid', uid);
}

export function getUserVariables(): Record<string, string> | undefined {
  try {
    const raw = localStorage.getItem('creator_profile');
    if (!raw) return undefined;
    const profile = JSON.parse(raw);
    const parts: string[] = [];
    if (profile.niche || profile.audience) {
      const core = [profile.niche && `赛道：${profile.niche}`, profile.audience && `受众：${profile.audience}`]
        .filter(Boolean).join(' | ');
      if (core) parts.push(core);
    }
    if (profile.nickname || profile.style || profile.contentFormat) {
      const ext = [profile.nickname && `昵称：${profile.nickname}`, profile.style && `文风：${profile.style}`, profile.contentFormat && `形式：${profile.contentFormat}`]
        .filter(Boolean).join(' | ');
      if (ext) parts.push(ext);
    }
    if (parts.length === 0) return undefined;
    return {
      user_profile_core: parts[0] || '',
      user_profile_text: parts.length > 1 ? parts[1] : '',
    };
  } catch {
    return undefined;
  }
}

// ─── 查询构建 ───

export function buildHotListQuery(platform: string = 'all'): string {
  if (platform === 'all') return '查看综合热榜 Top15';
  return `查看${platform}热榜`;
}

export function buildCopyGenerateQuery(topic: string, angles: string[], userProfile: any): string {
  let query = `为话题"${topic}"生成高质量爆款文案\n`;
  query += `角度：${angles.join('、')}\n`;
  query += `每个角度输出一条完整文案\n`;

  if (userProfile.niche) query += `赛道：${userProfile.niche}\n`;
  if (userProfile.audience) query += `受众：${userProfile.audience}\n`;
  if (userProfile.style) query += `文风：${userProfile.style}\n`;
  if (userProfile.contentFormat) query += `体裁：${userProfile.contentFormat}\n`;

  query += `\n直接输出，不要问问题，不要走列表流程`;
  return query;
}

export function buildTopicSearchQuery(keyword: string): string {
  return `搜索关键词：${keyword}`;
}

export function buildAnalysisQuery(copy: string): string {
  return `请分析以下文案为什么火，按五个部分输出：

1. 钩子分析 - 分析文案的钩子如何抓住注意力
2. 结构拆解 - 按表格列出每个段落的功能定位和情绪节奏
3. 关键元素 - 列出文案中的关键成功要素
4. 可复用模型 - 总结可复用的写作公式
5. 风险提示 - 指出文案中的风险和可优化点

以下是需要分析的文案内容（直接分析，不要询问更多信息）：
========================
${copy}
========================`;
}

export function buildRewriteQuery(copy: string, style: string): string {
  return `请用"${style}"风格改写以下文案，保留核心信息，直接输出改写结果不要询问其他信息。

原文案：
========================
${copy}
========================

改写要求：
- 保持核心信息和逻辑不变
- 换一种表达方式和措辞
- 适配${style}风格`;
}

export interface QuotaInfo {
  allowed: boolean;
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

export async function checkUserQuota(): Promise<QuotaInfo> {
  const userId = getUserId();
  const isLoggedIn = !!localStorage.getItem('coze_oauth_uid');
  try {
    const r = await fetch(`${PROXY_BASE}?action=quota`, {
      headers: {
        'x-user-id': userId,
        'x-logged-in': isLoggedIn ? 'true' : 'false',
      },
    });
    if (r.ok) return await r.json();
  } catch {}
  return { allowed: true, used: 0, limit: isLoggedIn ? 15 : 3, tier: isLoggedIn ? 'free' : 'anon', remaining: isLoggedIn ? 15 : 3 };
}

export async function incrementUserQuota(): Promise<QuotaInfo> {
  const userId = getUserId();
  const isLoggedIn = !!localStorage.getItem('coze_oauth_uid');
  try {
    const r = await fetch(`${PROXY_BASE}?action=increment`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
        'x-logged-in': isLoggedIn ? 'true' : 'false',
      },
    });
    if (r.ok) return await r.json();
    if (r.status === 429) {
      const data = await r.json();
      return { ...data, allowed: false };
    }
  } catch {}
  return { allowed: true, used: 0, limit: isLoggedIn ? 15 : 3, tier: isLoggedIn ? 'free' : 'anon', remaining: isLoggedIn ? 15 : 3 };
}
