const BASE = 'https://api.coze.cn';
const TOKEN = process.env.COZE_PAT_TOKEN;
const headers = {
  'Authorization': 'Bearer ' + TOKEN,
  'Content-Type': 'application/json',
};

async function testChat(query, label) {
  console.log('\n=== ' + label + ' ===');
  console.log('QUERY LENGTH:', query.length, 'chars');
  const r = await fetch(BASE + '/v3/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bot_id: '7639197902187020297',
      user_id: 'test_user_api',
      stream: false,
      auto_save_history: true,
      additional_messages: [{ role: 'user', content: query, content_type: 'text' }],
    }),
  });
  const d = await r.json();
  const chat = d.data || d;
  if (!chat.id) { console.log('FAIL:', d.msg); return; }
  console.log('Chat:', chat.id);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const r2 = await fetch(BASE + '/v3/chat/retrieve?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
    const d2 = await r2.json();
    const s = d2.data?.status;
    if (i % 5 === 0) console.log('  poll #' + i + ' status:', s);
    if (s === 'completed') {
      const r3 = await fetch(BASE + '/v3/chat/message/list?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
      const d3 = await r3.json();
      const msgs = d3.data || d3;
      const ans = Array.isArray(msgs) ? msgs.find(m => m.type === 'answer') : null;
      console.log('OK. time:', (i * 2) + 's');
      console.log('FULL OUTPUT:');
      console.log(ans?.content || '(empty)');
      return;
    } else if (s === 'failed') { console.log('FAILED'); return; }
  }
  console.log('TIMEOUT (120s)');
}

async function main() {
  // 模拟前端 buildCopyGenerateQuery 的格式
  const query = `【任务】为话题"如何看待达摩院、北大最新 Nature 成果，AI 绘制中国首张高精度风光分布图，这对新能源行业有何价值？"生成高质量爆款文案

【角度】知识型

【质量要求】
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

  await testChat(query, '前端格式 - 文案工坊(知识型)');
}

main();
