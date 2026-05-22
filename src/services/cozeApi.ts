const API_BASE = import.meta.env.PROD ? '/api/proxy' : 'https://api.coze.cn';

const cozeToken = import.meta.env.VITE_COZE_TOKEN || '';

function prodHeaders() {
  return { 'Content-Type': 'application/json' };
}

function devHeaders() {
  return {
    'Authorization': `Bearer ${cozeToken}`,
    'Content-Type': 'application/json',
  };
}

function getUrl(action: string, params?: Record<string, string>): string {
  if (import.meta.env.PROD) {
    const q = new URLSearchParams({ action, ...params }).toString();
    return `${API_BASE}?${q}`;
  }
  switch (action) {
    case 'chat': return `${API_BASE}/v3/chat`;
    case 'retrieve': return `${API_BASE}/v3/chat/retrieve?${new URLSearchParams(params)}`;
    case 'messages': return `${API_BASE}/v3/chat/message/list?${new URLSearchParams(params)}`;
    default: return API_BASE;
  }
}

function getHeaders(): Record<string, string> {
  return import.meta.env.PROD ? prodHeaders() : devHeaders();
}

function getUserId(): string {
  let userId = localStorage.getItem('coze_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('coze_user_id', userId);
  }
  return userId;
}

function getUserVariables(): Record<string, string> | undefined {
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
      user_profile_ext: parts.length > 1 ? parts[1] : '',
    };
  } catch {
    return undefined;
  }
}

export async function callCozeChat(
  query: string
): Promise<string> {
  const botId = import.meta.env.VITE_COZE_BOT_ID || '7639197902187020297';
  const userId = getUserId();
  const userVariables = getUserVariables();

  const headers = getHeaders();

  const body: Record<string, any> = {
    bot_id: botId,
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

  const chatResponse = await fetch(getUrl('chat'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    console.error('Chat API 请求失败:', chatResponse.status, errorText);
    throw new Error(`API Error: ${chatResponse.status} - ${errorText}`);
  }

  const chatResult = await chatResponse.json();
  const data = chatResult.data || chatResult;
  console.log('Chat API 响应:', JSON.stringify(data).slice(0, 500));

  if (!data.id || !data.conversation_id) {
    console.error('Chat API 响应格式异常:', JSON.stringify(chatResult).slice(0, 500));
    throw new Error('API 响应格式错误');
  }

  const { id: chat_id, conversation_id } = data;

  const maxRetries = 120;
  const retryInterval = 2000;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));

    try {
      const retrieveResponse = await fetch(
        getUrl('retrieve', { chat_id, conversation_id }),
        { headers }
      );

      if (!retrieveResponse.ok) continue;

      const retrieveResult = await retrieveResponse.json();
      const retrieveData = retrieveResult.data || retrieveResult;

      if (!retrieveData || typeof retrieveData !== 'object') continue;

      const status = retrieveData.status;
      if (!status) continue;

      if (i % 10 === 0) {
        console.log(`轮询第${i}次, status: ${status}`);
      }

      if (status === 'completed') {
        const messagesResponse = await fetch(
          getUrl('messages', { chat_id, conversation_id }),
          { headers }
        );

        if (messagesResponse.ok) {
          const messagesResult = await messagesResponse.json();
          let messages: any[] = [];

          if (messagesResult.data) messages = messagesResult.data;
          else if (Array.isArray(messagesResult)) messages = messagesResult;

          const answerMsg = messages.find((m: any) => m.type === 'answer' || m.type === 'final');
          if (answerMsg) return answerMsg.content || '';

          const msg = messages.find((m: any) => m.role === 'assistant');
          if (msg) return msg.content || '';

          if (messages.length > 0) return messages[0].content || '';
        }

        return '';
      } else if (status === 'failed') {
        throw new Error('Bot 执行失败');
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error('获取响应超时');
}

export async function syncUserVariables(): Promise<boolean> {
  if (!import.meta.env.PROD) return false;

  const botId = import.meta.env.VITE_COZE_BOT_ID || '7639197902187020297';
  const userId = getUserId();
  const userVariables = getUserVariables();
  if (!userVariables) return false;

  try {
    const r = await fetch(`/api/proxy?action=variables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: botId,
        user_id: userId,
        variables: userVariables,
      }),
    });
    const data = await r.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export function buildHotListQuery(platform: string = 'all'): string {
  if (platform === 'all') return '查看综合热榜 Top15';
  return `查看${platform}热榜`;
}

export function buildCopyGenerateQuery(
  topic: string,
  angles: string[],
  userProfile: any
): string {
  let query = `【任务】为话题"${topic}"生成高质量爆款文案\n\n`;
  query += `【角度】${angles.join('、')}\n`;
  query += `每个角度写一段完整文案，用【角度名】开头\n\n`;

  if (userProfile.niche) query += `【赛道】${userProfile.niche}\n`;
  if (userProfile.audience) query += `【受众】${userProfile.audience}\n`;
  if (userProfile.style) query += `【文风】${userProfile.style}\n`;
  if (userProfile.contentFormat) query += `【体裁】${userProfile.contentFormat}\n`;

  query += `\n【质量要求】
- 开头前3个字就要抓住注意力（反常识/扎心/悬念/对比）
- 多用短句、口语化、节奏感
- 自然融入 1-2 个 emoji，不堆砌
- 核心卖点只说 1 个，打透
- 结尾必须有互动钩子（提问/引导评论/反转）
- 不说正确的废话，每句话都有信息量
- 全文 80-150 字，不超 200 字

【规则】
- 直接输出文案，不提问，不询问任何信息
- 不要写备注说明
- 不写标题以外的格式标注`;

  return query;
}

export function buildTopicSearchQuery(keyword: string): string {
  return `搜索关键词：${keyword}`;
}

export function buildAnalysisQuery(copy: string): string {
  return `拆解这篇文案：${copy}`;
}

export function buildRewriteQuery(copy: string, style: string): string {
  return `基于这篇文案，用"${style}"风格洗稿：${copy}`;
}
