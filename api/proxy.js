const COZE_TOKEN = process.env.COZE_PAT_TOKEN;
const API_BASE = 'https://api.coze.cn';
const POLL_TIMEOUT_MS = 8500;
const POLL_INTERVAL_MS = 600;

async function pollUntilDone(chat_id, conversation_id, headers) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const r = await fetch(
      `${API_BASE}/v3/chat/retrieve?chat_id=${chat_id}&conversation_id=${conversation_id}`,
      { headers },
    );
    if (!r.ok) { await sleep(POLL_INTERVAL_MS); continue; }
    const data = (await r.json()).data || (await r.json());
    if (!data || !data.status) { await sleep(POLL_INTERVAL_MS); continue; }
    if (data.status === 'completed') return data;
    if (data.status === 'failed') throw new Error('Bot execution failed');
    await sleep(POLL_INTERVAL_MS);
  }
  return null;
}

async function getMessages(chat_id, conversation_id, headers) {
  const r = await fetch(
    `${API_BASE}/v3/chat/message/list?chat_id=${chat_id}&conversation_id=${conversation_id}`,
    { headers },
  );
  if (!r.ok) return null;
  const result = await r.json();
  const messages = result.data || result;
  if (!Array.isArray(messages)) return null;
  const answer = messages.find(m => m.type === 'answer' || m.type === 'final');
  if (answer) return answer.content;
  const assistant = messages.find(m => m.role === 'assistant');
  if (assistant) return assistant.content;
  return messages[0]?.content || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

      const result = await pollUntilDone(chatInfo.id, chatInfo.conversation_id, headers);
      if (!result) {
        return res.json({ chat_id: chatInfo.id, conversation_id: chatInfo.conversation_id, timeout: true });
      }

      const content = await getMessages(chatInfo.id, chatInfo.conversation_id, headers);
      if (content) {
        return res.json({ content });
      }
      return res.json({ content: '' });
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
