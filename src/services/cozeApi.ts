const PROXY_BASE = '/api/proxy';
const BOT_ID = import.meta.env.VITE_COZE_BOT_ID || '7639197902187020297';

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
  const r = await fetch(`${PROXY_BASE}?action=get_token`, { method: 'GET' });
  const data = await r.json();
  return data.access_token || '';
}

// ─── API 调用 ───

export async function callCozeChat(query: string, oauthUid?: string): Promise<string> {
  const userId = oauthUid || getUserId();
  const userVariables = getUserVariables();
  console.log('callCozeChat: userId=%s, oauthUid=%s, query=%s', userId, oauthUid || '(none)', query.slice(0, 50));

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

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 55000);

  const chatResponse = await fetch(`${PROXY_BASE}?action=chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: abortController.signal,
    body: JSON.stringify(body),
  });
  clearTimeout(timeoutId);

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    console.error('Chat API 请求失败:', chatResponse.status, errorText);
    throw new Error(`API Error: ${chatResponse.status} - ${errorText}`);
  }

  const result = await chatResponse.json();
  console.log('callCozeChat: proxy response', JSON.stringify(result).slice(0, 200));

  if (result.content !== undefined) {
    return result.content;
  }

  if (result.timeout && result.chat_id) {
    return pollForResult(result.chat_id, result.conversation_id);
  }

  const chatInfo = result.data || result;
  if (chatInfo?.id && chatInfo?.conversation_id) {
    return pollForResult(chatInfo.id, chatInfo.conversation_id);
  }

  console.error('Chat API 响应格式异常:', JSON.stringify(result).slice(0, 500));
  throw new Error('API 响应格式错误');
}

async function pollForResult(chat_id: string, conversation_id: string): Promise<string> {
  console.log('pollForResult: start chat_id=%s conv_id=%s', chat_id, conversation_id);
  const maxRetries = 40;
  const retryInterval = 3000;
  const fetchOpts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include' as RequestCredentials };

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));
    console.log('pollForResult: iteration %d/%d', i + 1, maxRetries);

    try {
      // ─── Wait for retrieve completed first ───
      const retrieveResponse = await fetch(
        `${PROXY_BASE}?action=retrieve&chat_id=${chat_id}&conversation_id=${conversation_id}`,
        fetchOpts
      );
      if (!retrieveResponse.ok) {
        console.log('pollForResult: retrieve HTTP %d', retrieveResponse.status);
        continue;
      }

      const retrieveResult = await retrieveResponse.json();
      const retrieveData = retrieveResult.data || retrieveResult;
      const status = retrieveData?.status;
      if (i % 3 === 0) console.log('pollForResult: iter %d, retrieve_status=%s', i + 1, status || 'unknown');

      if (status === 'failed') throw new Error('Bot 执行失败');
      if (status !== 'completed') continue;

      // ─── Bot completed, fetch messages once ───
      console.log('pollForResult: retrieve completed, fetching messages');
      const messagesResponse = await fetch(
        `${PROXY_BASE}?action=messages&chat_id=${chat_id}&conversation_id=${conversation_id}`,
        fetchOpts
      );
      if (!messagesResponse.ok) {
        console.log('pollForResult: messages HTTP %d after completed', messagesResponse.status);
        continue;
      }

      const messagesResult = await messagesResponse.json();
      console.log('pollForResult: messages response keys:', Object.keys(messagesResult));

      let messages: any[] = messagesResult.data || messagesResult;
      if (!Array.isArray(messages)) {
        console.log('pollForResult: messages is NOT array after completed, type=', typeof messages);
        continue;
      }

      console.log('pollForResult: messages count=%d after completed', messages.length);
      if (messages.length > 0) {
        console.log('pollForResult: first msg sample:', JSON.stringify(messages[0]).slice(0, 300));
        console.log('pollForResult: msg types:', [...new Set(messages.map((m: any) => m.type || m.role))].join(','));
      }

      // Try answer/final first, then assistant, then first message
      const answerMsg = messages.find((m: any) => m.type === 'answer' || m.type === 'final');
      if (answerMsg?.content) return answerMsg.content;

      const assistantMsg = messages.find((m: any) => m.role === 'assistant');
      if (assistantMsg?.content) return assistantMsg.content;

      if (messages.length > 0 && messages[0].content) return messages[0].content;

      return '';
    } catch (e) {
      console.error('pollForResult: iteration %d error:', i + 1, e);
      continue;
    }
  }
  console.error('pollForResult: exhausted after %d iterations', maxRetries);
  throw new Error('获取响应超时');
}

export async function syncUserVariables(oauthUid?: string): Promise<boolean> {
  const userId = oauthUid || getUserId();
  const userVariables = getUserVariables();
  if (!userVariables) return false;

  try {
    const body = {
      bot_id: BOT_ID,
      user_id: userId,
      stream: false, auto_save_history: false,
      additional_messages: [{ role: 'user', content: '[系统] 更新用户变量', content_type: 'text' }],
      custom_variables: userVariables,
    };
    const r = await fetch(`${PROXY_BASE}?action=variables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return data?.ok === true;
  } catch {
    return false;
  }
}

// ─── 用户 ID / 变量 ───

export function getUserId(): string {
  let userId = localStorage.getItem('coze_api_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('coze_api_user_id', userId);
  }
  return userId;
}

export function setUserId(uid: string): void {
  // OAuth uid is stored separately; API calls always use coze_api_user_id (random local ID)
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
  let query = `【任务】为话题"${topic}"生成高质量爆款文案\n\n`;
  query += `【角度】${angles.join('、')}\n`;
  query += `每个角度输出一条完整文案，严格按下面的【输出格式】\n\n`;

  if (userProfile.niche) query += `【赛道】${userProfile.niche}\n`;
  if (userProfile.audience) query += `【受众】${userProfile.audience}\n`;
  if (userProfile.style) query += `【文风】${userProfile.style}\n`;
  if (userProfile.contentFormat) query += `【体裁】${userProfile.contentFormat}\n`;

  query += `\n【知识库引用】必须从知识库中调用爆款文案框架来生成：
角度→框架映射：
- 共鸣型 → PAS（问题-放大-解决）或 场景代入
- 知识型 → AIDA（注意-兴趣-欲望-行动）
- 观点型 → BAB（Before-After-Bridge）
- 趣味型 → 悬念开头 + PPP（Promise-Picture-Punch）
- 实用型 → FAB（特征-优势-利益）
- 关联型 → PASTOR（问题-放大-故事-方案）
- 决策纠结型 → 对比框架（Before vs After）
- 问题原因型 → 问题-原因-方案
- 填补盲区型 → 反常识 + 数据支撑
- 替用户说话 → 场景代入 + 情绪共鸣
- 行业发心型 → 故事开头 + 价值升华

同时参考知识库中的平台模板调整语气和段落结构。

【输出格式】
每个角度按以下结构输出：

🎯 【第X种角度：角度名】
**选用框架：**[使用的框架名称]
**切入逻辑：**一句话说明为什么用这个角度

▎开头
[前3-5字钩子+完整开头段落，1-2句抓住注意力]

▎正文
[分段正文，每段2-3句话，空行分隔；使用框架结构展开]

▎结尾
[金句收尾 / 互动引导 / 反转收尾]

【质量要求】
- 开头前3个字必须抓住注意力（反常识/扎心提问/惊人数据/悬念缺口/强烈对比）
- 禁止平淡开头："最近""今天""我觉得""很多人"
- 只说1个核心观点，打透
- 多用短句、口语化、有节奏感
- 自然融入 1-2 个 emoji，不堆砌
- 每句话都有信息量，不凑字数
- 结尾必须有互动钩子（提问引导评论/反转收尾/悬念引导点击/共鸣金句）
- 全文 150-300 字，不超过 350 字

【规则】
- 直接输出文案，不要问任何问题，不要询问赛道/受众/文风等信息
- 没有赛道和受众信息就直接写通用文案
- 不要写备注说明`;

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
