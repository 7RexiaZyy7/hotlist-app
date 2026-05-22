const COZE_TOKEN = process.env.COZE_PAT_TOKEN;
const API_BASE = 'https://api.coze.cn';

export default async function handler(req, res) {
  try {
    if (action(req, 'hotboard') && req.method === 'GET') {
      const { type } = req.query;
      if (!type) return res.status(400).json({ error: 'Missing type parameter' });
      const uapisUrl = `https://uapis.cn/api/v1/misc/hotboard?type=${encodeURIComponent(type)}`;
      const r = await fetch(uapisUrl);
      const data = await r.json();
      return res.status(r.status).json(data);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!COZE_TOKEN) {
    return res.status(500).json({ error: 'COZE_PAT_TOKEN not configured' });
  }

  try {
    const headers = {
      'Authorization': `Bearer ${COZE_TOKEN}`,
      'Content-Type': 'application/json',
    };

    if (action(req, 'chat') && req.method === 'POST') {
      const chatRes = await fetch(`${API_BASE}/v3/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body),
      });
      const chatData = await chatRes.json();
      const chatInfo = chatData.data || chatData;
      if (!chatInfo.id || !chatInfo.conversation_id) {
        return res.status(chatRes.status).json(chatData);
      }
      return res.json({ chat_id: chatInfo.id, conversation_id: chatInfo.conversation_id, timeout: true });
    }

    if (action(req, 'retrieve') && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await fetch(
        `${API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers },
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action(req, 'messages') && req.method === 'GET') {
      const { chat_id, conversation_id } = req.query;
      const r = await fetch(
        `${API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
        { headers },
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (action(req, 'variables') && req.method === 'POST') {
      const { bot_id, user_id, variables } = req.body;
      const body = {
        bot_id, user_id, stream: false, auto_save_history: false,
        additional_messages: [{ role: 'user', content: '[系统] 更新用户变量', content_type: 'text' }],
      };
      if (variables) body.custom_variables = variables;
      const r = await fetch(`${API_BASE}/v3/chat`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(r.status).json({ ok: r.ok, chat_id: data?.data?.id });
    }

    return res.status(404).json({ error: `Unknown action: ${req.query.action}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function action(req, name) {
  return req.query.action === name;
}
