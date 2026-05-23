const BASE = 'https://api.coze.cn';
const TOKEN = process.env.COZE_PAT_TOKEN;
const headers = {
  'Authorization': 'Bearer ' + TOKEN,
  'Content-Type': 'application/json',
};

async function main() {
  const r = await fetch(BASE + '/v3/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bot_id: '7639197902187020297',
      user_id: 'test_user_api',
      stream: false,
      auto_save_history: true,
      additional_messages: [{ role: 'user', content: '查看综合热榜 Top15', content_type: 'text' }],
    }),
  });
  const d = await r.json();
  const chat = d.data || d;
  if (!chat.id) { console.log('FAIL create:', d.msg); return; }
  console.log('Chat:', chat.id, 'Conv:', chat.conversation_id);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const r2 = await fetch(BASE + '/v3/chat/retrieve?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
    const d2 = await r2.json();
    const s = d2.data?.status;
    if (i % 5 === 0) console.log('  poll #' + (i+1) + ' status:', s);
    if (s === 'completed') {
      const r3 = await fetch(BASE + '/v3/chat/message/list?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
      const d3 = await r3.json();
      const msgs = d3.data || d3;
      const ans = Array.isArray(msgs) ? msgs.find(m => m.type === 'answer') : null;
      console.log('OK. Reply:', ans?.content?.slice(0, 500));
      return;
    } else if (s === 'failed') {
      console.log('FAILED');
      // Get last_error
      console.log('  last_error:', JSON.stringify(d2.data?.last_error));
      return;
    }
  }
  console.log('TIMEOUT');
}
main();
