import fetch from 'node-fetch';

async function testApis() {
  console.log('测试各热榜API...\n');

  const apis = [
    { name: '抖音', url: 'https://uapis.cn/api/v1/misc/hotboard?type=douyin' },
    { name: '微博', url: 'https://uapis.cn/api/v1/misc/hotboard?type=weibo' },
    { name: '知乎', url: 'https://uapis.cn/api/v1/misc/hotboard?type=zhihu' },
    { name: 'B站', url: 'https://uapis.cn/api/v1/misc/hotboard?type=bilibili' },
    { name: '小红书(新)', url: 'https://60s.viki.moe/v2/rednote' },
  ];

  for (const api of apis) {
    const start = Date.now();
    try {
      const res = await fetch(api.url, { timeout: 8000 });
      const data = await res.json();
      const time = Date.now() - start;

      // 检查不同API的响应格式
      if (api.name.includes('小红书')) {
        if (res.ok && data.code === 200 && Array.isArray(data.data)) {
          console.log(`✅ ${api.name}: OK (${time}ms) - ${data.data.length} 条数据`);
        } else {
          console.log(`❌ ${api.name}: 返回格式异常`);
        }
      } else {
        if (res.ok && data.list) {
          console.log(`✅ ${api.name}: OK (${time}ms) - ${data.list.length} 条数据`);
        } else {
          console.log(`❌ ${api.name}: 返回格式异常`);
        }
      }
    } catch (e) {
      console.log(`❌ ${api.name}: 连接失败 - ${e.message}`);
    }
  }
}

testApis();
