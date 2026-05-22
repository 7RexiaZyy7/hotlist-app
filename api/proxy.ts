const COZE_TOKEN = process.env.COZE_PAT_TOKEN;
const API_BASE = 'https://api.coze.cn';

export default async function handler(
  req: { query: Record<string, string | string[]>; method?: string; body: any },
  res: { status: (code: number) => { json: (data: any) => void } }
) {
  const action = req.query.action as string;

  if (!COZE_TOKEN) {
    return res.status(500).json({ error: 'COZE_PAT_TOKEN not configured' });
  }

  const headers = {
    'Authorization': `Bearer ${COZE_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'chat' && req.method === 'POST') {
      const { bot_id, user_id, query, user_variables } = req.body;

      const body: Record<string, any> = {
        bot_id,
        user_id,
        stream: false,
        auto_save_history: true,
        additional_messages: [{ role: 'user', content: query, content_type: 'text' }],
      };

      if (user_variables) {
        body.custom_variables = user_variables;
      }

      const r = await fetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'retrieve' && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await fetch(
        `${API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers },
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'messages' && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await fetch(
        `${API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers },
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action === 'variables' && req.method === 'POST') {
      const { bot_id, user_id, variables } = req.body;

      const body: Record<string, any> = {
        bot_id,
        user_id,
        stream: false,
        auto_save_history: false,
        additional_messages: [{
          role: 'user',
          content: '[系统] 更新用户变量',
          content_type: 'text',
        }],
      };

      if (variables) {
        body.custom_variables = variables;
      }

      const r = await fetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await r.json();
      return res.status(r.status).json({ ok: r.ok, chat_id: data?.data?.id });
    }

    return res.status(404).json({ error: `Unknown action: ${action}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
