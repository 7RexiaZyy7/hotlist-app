import fetch from 'node-fetch';

async function testXhsProperly() {
  try {
    console.log('测试小红书API (正确方式)...\n');
    const res = await fetch('https://60s.viki.moe/v2/rednote', { 
      timeout: 10000,
      headers: {
        'Accept': 'application/json; charset=utf-8'
      }
    });
    
    // 先检查响应的原始文本
    const rawText = await res.text();
    console.log('原始响应长度:', rawText.length, '字符');
    
    // 再解析JSON
    const data = JSON.parse(rawText);
    console.log('\n=== 解析成功 ===');
    console.log('code:', data.code);
    console.log('message:', data.message);
    console.log('data数组长度:', data.data?.length);
    
    if (data.data && data.data.length > 0) {
      console.log('\n=== 前5条数据 ===');
      data.data.slice(0, 5).forEach((item, i) => {
        console.log(`${i+1}. rank=${item.rank}, title="${item.title}", score=${item.score}`);
      });
    }
  } catch (e) {
    console.error('错误:', e);
    console.error('堆栈:', e.stack);
  }
}

testXhsProperly();