export const PROXY_BASE = '/api/proxy';
const COZE_API_BASE = 'https://api.coze.cn';
const BOT_ID = import.meta.env.VITE_COZE_BOT_ID || '7639197902187020297';

// ─── Token 管理 ───

function getPatToken(): string {
  const token = import.meta.env.VITE_COZE_TOKEN;
  if (!token || token.length < 20) {
    console.error('Coze PAT token 未配置，请在 .env 中设置 VITE_COZE_TOKEN');
    throw new Error('Coze API 未配置');
  }
  return token;
}

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

// ─── API 调用 ───

export async function callCozeChat(query: string): Promise<string> {
  const userId = getUserId();
  const userVariables = getUserVariables();

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
  const token = getPatToken();
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
    throw new Error(`Coze API 错误: ${chatResponse.status} - ${errorText}`);
  }

  const chatResult = await chatResponse.json();

  const data = chatResult.data || chatResult;

  const chatId = data?.id || data?.chat_id;
  const conversationId = data?.conversation_id;

  if (!chatId || !conversationId) {
    console.error('callDirect: missing id or conversation_id, data=', JSON.stringify(data));
    throw new Error(`Coze API 响应格式错误: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return pollForResult(chatId, conversationId);
}

async function pollForResult(chat_id: string, conversation_id: string): Promise<string> {
  const maxRetries = 45;
  const retryInterval = 1500;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));

    try {
      const token = getPatToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const retrieveResponse = await fetch(
        `${COZE_API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers }
      );
      
      if (!retrieveResponse.ok) {
        console.error('pollForResult: retrieve failed, status=%d', retrieveResponse.status);
        if (retrieveResponse.status === 401) {
          console.error('pollForResult: 401 Unauthorized - 请检查 VITE_COZE_TOKEN 是否有效');
        }
        continue;
      }

      const retrieveResult = await retrieveResponse.json();
      const retrieveData = retrieveResult.data || retrieveResult;
      const status = retrieveData?.status;

      if (!status) continue;
      if (status === 'failed') {
        const errorMsg = retrieveData?.error?.msg || retrieveData?.last_error?.msg || '未知错误';
        throw new Error(`Bot 执行失败: ${errorMsg}`);
      }
      if (status !== 'completed') continue;

      const messagesResponse = await fetch(
        `${COZE_API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers }
      );
      if (!messagesResponse.ok) {
        console.error('pollForResult: messages failed, status=%d', messagesResponse.status);
        continue;
      }

      const messagesResult = await messagesResponse.json();
      const messages = messagesResult.data || messagesResult;
      if (!Array.isArray(messages)) continue;

      // 优先取干净的最终回复，避免被 tool_response 的原始 JSON 截胡
      const answerMsg = messages.find((m: any) => m.type === 'answer' || m.type === 'final');
      if (answerMsg?.content) return answerMsg.content;

      // 回退：取最后一个非工具类、非 verbose 的 assistant 消息
      const assistantMsg = [...messages].reverse().find(
        (m: any) => m.role === 'assistant'
          && m.type !== 'function_call'
          && m.type !== 'tool_response'
          && m.type !== 'verbose'
      );
      if (assistantMsg?.content) return assistantMsg.content;

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
    const token = getPatToken();
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

export function getUserProfileFromStorage(): Record<string, string> | undefined {
  try {
    const raw = localStorage.getItem('creator_profile');
    if (!raw) return undefined;
    const profile = JSON.parse(raw);
    if (!profile || typeof profile !== 'object') return undefined;
    return profile;
  } catch {
    return undefined;
  }
}

export function formatProfileForPrompt(profile: Record<string, string> | undefined): string {
  if (!profile) return '';
  const lines: string[] = [];
  if (profile.niche) lines.push(`赛道：${profile.niche}`);
  if (profile.audience) lines.push(`受众：${profile.audience}`);
  if (profile.nickname) lines.push(`昵称：${profile.nickname}`);
  if (profile.style) lines.push(`文风：${profile.style}`);
  if (profile.contentFormat) lines.push(`体裁：${profile.contentFormat}`);
  return lines.join('\n');
}

export function getUserVariables(): Record<string, string> | undefined {
  const profile = getUserProfileFromStorage();
  if (!profile) return undefined;

  const coreParts: string[] = [];
  if (profile.niche) coreParts.push(`赛道：${profile.niche}`);
  if (profile.audience) coreParts.push(`受众：${profile.audience}`);

  const extParts: string[] = [];
  if (profile.nickname) extParts.push(`昵称：${profile.nickname}`);
  if (profile.style) extParts.push(`文风：${profile.style}`);
  if (profile.contentFormat) extParts.push(`体裁：${profile.contentFormat}`);

  if (coreParts.length === 0 && extParts.length === 0) return undefined;
  return {
    user_profile_core: coreParts.join(' | '),
    user_profile_text: extParts.join(' | '),
  };
}

// ─── 查询构建 ───

export function buildCopyGenerateQuery(topic: string, angles: string[], userProfile: any, analysis?: string): string {
  let query = `请为以下话题生成高质量爆款文案：

话题：${topic}
角度：${angles.join('、')}
每个角度输出一条完整文案`;

  if (analysis) {
    query += `\n\n话题分析结果（请参考以下信息来选择最佳切入角度和内容）：
${analysis}`;
  }

  const profileText = formatProfileForPrompt(userProfile);
  if (profileText) {
    query += `\n\n用户偏好：\n${profileText}`;
  }

  query += `

文案要求：
- 开头 3 个字必须抓住注意力（反常识/扎心提问/悬念缺口/具体数据）
- 禁止开头用「最近」「今天」「我觉得」「很多人」
- 只说 1 个核心观点，打透，不说正确的废话
- 多用短句、口语化、有节奏感
- 自然融入 1-2 个 emoji，不堆砌
- 结尾必须有互动钩子（提问/反转/悬念），禁止无效提问「你觉得呢」
- 全文 150-300 字，不超过 350 字

去 AI 味要求：
- 句式长短不一，避免 AI 的「完美感」
- 加入口语化表达和语气词（「说真的」「你猜怎么着」）
- 适当加入不完美的表达（省略号、破折号、口语省略）
- 避免「首先...其次...最后...」的 AI 八股结构
- 加入具体的个人经验或场景细节（可以虚构）

直接输出文案，不要问问题，不要解释，不要走列表流程`;
  return query;
}

export function buildTopicSearchQuery(keyword: string): string {
  return `请搜索关于"${keyword}"的最新热点话题和讨论，覆盖微博、抖音、小红书、知乎等平台。

要求：
1. 返回该话题下最热门的 5-10 个子话题或讨论角度
2. 每个子话题标注来源平台和热度
3. 优先返回最近 24 小时内的新讨论
4. 剔除无意义内容（纯明星日常、广告等）

直接输出话题列表，不要问问题`;
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

export function buildTopicAnalysisQuery(topic: string): string {
  return `请深度分析以下热点话题的创作价值，输出结构化的分析报告：

话题：${topic}

分析维度：

1. 🔥 为什么火
   - 触发事件：什么事件/现象引发了讨论
   - 情绪特征：争议型/共鸣型/好奇型/焦虑型/娱乐型
   - 受众画像：谁在讨论，核心人群特征
   - 时间窗口：爆发期/持续期/衰退期（判断是否还值得追）

2. 📊 各平台讨论差异
   用表格对比抖音、小红书、知乎、B站上该话题的不同讨论角度和主流观点

3. 💡 建议切入角度（3-5 个）
   每个角度包含：
   - 角度类型（争议型/知识型/共鸣型/趣味型/实用型）
   - 建议标题（具体可直接使用的标题）
   - 适合平台（抖音/小红书/公众号等）
   - 预估效果（为什么这个角度容易火）

4. ⚠️ 风险提示
   - 争议风险（会不会翻车）
   - 时效性（还能火多久）
   - 合规风险（有没有敏感点）

5. 🎯 创作建议
   - 推荐的内容形式（短视频/图文/长文）
   - 推荐的写作风格
   - 需要避免的坑

直接输出分析报告，不要问问题`;
}

export function buildRewriteQuery(copy: string, style: string): string {
  return `请用「${style}」风格改写以下文案，保留核心信息，直接输出改写结果不要询问其他信息。

原文案：
========================
${copy}
========================

改写要求：
- 保持核心信息和逻辑不变
- 换一种表达方式和措辞
- 适配 ${style} 风格`;
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
