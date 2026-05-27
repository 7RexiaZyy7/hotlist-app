import fetch from 'node-fetch';

async function testXhs() {
  try {
    console.log('测试小红书API...\n');
    const res = await fetch('https://60s.viki.moe/v2/rednote', { timeout: 10000 });
    const data = await res.json();
    console.log('完整响应:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('错误:', e);
  }
}

testXhs();