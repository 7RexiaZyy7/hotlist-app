const BASE = 'https://api.coze.cn';
const TOKEN = process.env.COZE_PAT_TOKEN;
const headers = {
  'Authorization': 'Bearer ' + TOKEN,
  'Content-Type': 'application/json',
};

async function testChat(query, label, timeout) {
  console.log('\n=== ' + label + ' ===');
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
  if (!chat.id) { console.log('  Fail:', d.msg || JSON.stringify(d).slice(0,200)); return; }
  console.log('  Chat ID:', chat.id, 'Conv:', chat.conversation_id);

  for (let i = 0; i < Math.floor(timeout/2); i++) {
    await new Promise(r => setTimeout(r, 2000));
    const r2 = await fetch(BASE + '/v3/chat/retrieve?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
    const d2 = await r2.json();
    const s = d2.data?.status;
    if (s === 'completed') {
      const r3 = await fetch(BASE + '/v3/chat/message/list?chat_id=' + chat.id + '&conversation_id=' + chat.conversation_id, { headers });
      const d3 = await r3.json();
      const msgs = d3.data || d3;
      const answer = Array.isArray(msgs) ? msgs.find(m => m.type === 'answer') : null;
      console.log('  OK. Reply:', answer?.content?.slice(0, 500));
      return;
    } else if (s === 'failed') {
      console.log('  FAILED');
      return;
    }
  }
  console.log('  TIMEOUT(' + timeout + 's)');
}

async function main() {
  // 1. 文案工坊
  await testChat(
    '帮我写一篇文案，主题是知乎热榜上的"达摩院、北大研究"这个话题，用于抖音短视频口播，要求吸引人、有互动引导',
    '文案工坊 - 达摩院/北大研究',
    90
  );

  // 2. 爆款拆解
  await testChat(
    '帮我拆解一下这篇文案为什么火："26 年普通人怎么用 30 天时间系统性的自学 AI？去年我花了起码 18 万在各种工具的订阅费和培训费上，终于总结出了这套最适合一个人自学的 AI 入门指南。现在我就把花钱踩坑的经验全部免费分享给你，不需要你懂英文，会编程，也不需要你花钱去上昂贵的课。5 分钟看完这条视频，零基础的小白也能让 AI 替你干活，创收。"',
    '爆款拆解',
    90
  );

  // 3. 话题勘探
  await testChat(
    '帮我分析一下知乎热榜上"达摩院、北大研究"这个话题，看看有哪些写作角度和切入点，适合做短视频内容',
    '话题勘探',
    90
  );

  // 4. 文案洗稿
  await testChat(
    '请帮我改写这篇文案，保留核心信息但换一种表达方式，用于发布在微信公众号： "26 年普通人怎么用 30 天时间系统性的自学 AI？去年我花了起码 18 万在各种工具的订阅费和培训费上，终于总结出了这套最适合一个人自学的 AI 入门指南。现在我就把花钱踩坑的经验全部免费分享给你，不需要你懂英文，会编程，也不需要你花钱去上昂贵的课。5 分钟看完这条视频，零基础的小白也能让 AI 替你干活，创收。"',
    '文案洗稿',
    120
  );
}

main();
