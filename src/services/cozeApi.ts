export interface CozeConfig {
  botId: string;
  token: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  content_type: 'text';
}

export interface CozeChatRequest {
  bot_id: string;
  user_id: string;
  stream: boolean;
  auto_save_history: boolean;
  additional_messages: ChatMessage[];
}

export interface CozeChatResponse {
  id: string;
  conversation_id: string;
  status: string;
  messages?: Array<{
    role: string;
    content: string;
    content_type: string;
  }>;
}

const API_BASE = 'https://api.coze.cn';

export async function callCozeChat(
  config: CozeConfig,
  query: string
): Promise<string> {
  let userId = localStorage.getItem('coze_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('coze_user_id', userId);
  }
  
  console.log('[COZE API] 开始调用', { botId: config.botId, userId, query });
  
  const chatResponse = await fetch(`${API_BASE}/v3/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.token}`,
    },
    body: JSON.stringify({
      bot_id: config.botId,
      user_id: userId,
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: 'user',
          content: query,
          content_type: 'text',
        },
      ],
    }),
  });

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    console.error('[COZE API] 创建对话失败', { status: chatResponse.status, errorText });
    throw new Error(`API Error: ${chatResponse.status} - ${errorText}`);
  }

  const chatResult = await chatResponse.json();
  console.log('[COZE API] 创建对话响应', chatResult);
  
  const data = chatResult.data || chatResult;
  
  if (!data.id || !data.conversation_id) {
    console.error('[COZE API] 响应缺少必要字段', chatResult);
    throw new Error('API 响应格式错误');
  }
  
  const { id: chat_id, conversation_id } = data;
  
  // 轮询获取结果（热榜插件可能需要较长时间）
  const maxRetries = 60;
  const retryInterval = 1500;
  
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, retryInterval));
    
    const retrieveResponse = await fetch(
      `${API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
      {
        headers: {
          'Authorization': `Bearer ${config.token}`,
        },
      }
    );
    
    if (!retrieveResponse.ok) {
      console.log(`[COZE API] 轮询第${i+1}次 - HTTP错误: ${retrieveResponse.status}`);
      continue;
    }
    
    const retrieveResult = await retrieveResponse.json();
    const retrieveData = retrieveResult.data || retrieveResult;
    
    if (typeof retrieveData !== 'object' || retrieveData === null) {
      console.log(`[COZE API] 轮询第${i+1}次 - 响应格式异常`, retrieveResult);
      continue;
    }
    
    const status = retrieveData.status;
    console.log(`[COZE API] 轮询第${i+1}次`, { status });
    
    if (!status) {
      console.log(`[COZE API] 轮询第${i+1}次 - 缺少status字段`, retrieveData);
      continue;
    }
    
    if (status === 'completed') {
      console.log('[COZE API] 对话已完成，开始获取消息列表');
      
      const messagesResponse = await fetch(
        `${API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        {
          headers: {
            'Authorization': `Bearer ${config.token}`,
          },
        }
      );
      
      if (messagesResponse.ok) {
        const messagesResult = await messagesResponse.json();
        console.log('[COZE API] 获取消息响应:', JSON.stringify(messagesResult, null, 2));
        
        // 尝试多种方式获取消息
        let messages = [];
        
        if (messagesResult.data) {
          messages = messagesResult.data;
        } else if (Array.isArray(messagesResult)) {
          messages = messagesResult;
        }
        
        console.log(`[COZE API] 找到 ${messages.length} 条消息`);
        
        // 打印所有消息的角色和类型
        messages.forEach((msg: any, idx: number) => {
          console.log(`[COZE API] 消息${idx}: role=${msg.role}, type=${msg.type}, content=${msg.content?.substring(0, 150)}...`);
        });
        
        // 优先查找 type='answer' 的消息（这是 COZE Agent 的最终回复）
        const answerMsg = messages.find((m: any) => m.type === 'answer' || m.type === 'final');
        if (answerMsg) {
          console.log('[COZE API] 找到最终回复消息:', answerMsg.content?.substring(0, 200));
          return answerMsg.content || '';
        }
        
        // 其次查找 role='assistant' 的消息
        const assistantMsg = messages.find((m: any) => m.role === 'assistant');
        if (assistantMsg) {
          console.log('[COZE API] 找到助手消息:', assistantMsg.content?.substring(0, 200));
          return assistantMsg.content || '';
        }
        
        // 如果都没找到，返回第一条消息
        if (messages.length > 0) {
          console.log('[COZE API] 返回第一条消息:', messages[0].content?.substring(0, 200));
          return messages[0].content || '';
        }
      }
      
      console.log('[COZE API] 未找到任何消息');
      return '';
    } else if (status === 'failed') {
      console.error('[COZE API] Bot 执行失败', retrieveData);
      throw new Error('Bot 执行失败');
    }
  }
  
  console.error('[COZE API] 轮询超时');
  throw new Error('获取响应超时');
}

export function extractAssistantContent(response: CozeChatResponse): string {
  if (response.messages && response.messages.length > 0) {
    const assistantMsg = response.messages.find((m) => m.role === 'assistant');
    return assistantMsg?.content || '';
  }
  return '';
}

export function buildHotListQuery(platform: string = 'all'): string {
  if (platform === 'all') {
    return '查看综合热榜 Top15';
  }
  return `查看${platform}热榜`;
}

export function buildTopicSearchQuery(keyword: string): string {
  return `搜索关键词：${keyword}`;
}

export function buildCopyGenerateQuery(
  topic: string,
  angles: string[],
  userProfile: any
): string {
  let query = `基于话题：${topic}\n`;
  query += `请用以下角度生成文案：${angles.join('、')}\n`;
  
  if (userProfile.niche) {
    query += `赛道：${userProfile.niche}\n`;
  }
  if (userProfile.audience) {
    query += `目标受众：${userProfile.audience}\n`;
  }
  if (userProfile.style) {
    query += `文风偏好：${userProfile.style}\n`;
  }
  
  return query;
}

export function buildAnalysisQuery(copy: string): string {
  return `拆解这篇文案：${copy}`;
}

export function buildRewriteQuery(copy: string, style: string): string {
  return `基于这篇文案，用"${style}"风格洗稿：${copy}`;
}
