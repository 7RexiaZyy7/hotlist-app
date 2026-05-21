const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

let config;
try {
  config = require('./config.js');
} catch (e) {
  console.error('请先创建 config.js（参考 config.example.js）');
  process.exit(1);
}

const { botId, token, baseUrl } = config.coze;
const parsedUrl = new URL(baseUrl);

const results = {
  testId: Date.now().toString(36),
  startTime: new Date().toISOString(),
  config: config.test,
  scenarios: [],
};

class RateLimiter {
  constructor(maxRequests, perSeconds) {
    this.maxRequests = maxRequests;
    this.perSeconds = perSeconds;
    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.waiting = [];
  }

  async acquire() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxRequests, this.tokens + elapsed * (this.maxRequests / this.perSeconds));
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitTime = ((1 - this.tokens) / (this.maxRequests / this.perSeconds)) * 1000;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.tokens = Math.min(this.maxRequests, this.tokens + 1);
        this.tokens -= 1;
        resolve();
      }, Math.ceil(waitTime));
    });
  }
}

function chatRequest(query) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      bot_id: botId,
      user_id: `test_user_${Date.now()}`,
      stream: false,
      auto_save_history: false,
      additional_messages: [
        {
          role: 'user',
          content: query,
          content_type: 'text',
        },
      ],
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: '/v3/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(requestBody),
      },
      timeout: 30000,
    };

    const startTime = Date.now();

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { raw: data };
        }
        resolve({
          statusCode: res.statusCode,
          latency,
          headers: {
            'x-ratelimit-limit': res.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': res.headers['x-ratelimit-remaining'],
            'x-ratelimit-reset': res.headers['x-ratelimit-reset'],
            'retry-after': res.headers['retry-after'],
          },
          body: parsed,
        });
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      resolve({
        statusCode: 0,
        latency,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = Date.now() - startTime;
      resolve({
        statusCode: 408,
        latency,
        error: 'Request timeout',
      });
    });

    req.write(requestBody);
    req.end();
  });
}

async function runScenario(name, scenarioConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`开始测试场景: ${name}`);
  console.log(`参数: ${JSON.stringify(scenarioConfig)}`);
  console.log(`${'='.repeat(60)}`);

  const scenarioResult = {
    name,
    config: scenarioConfig,
    startTime: new Date().toISOString(),
    requests: [],
    summary: {
      total: 0,
      success: 0,
      rateLimited: 0,
      serverError: 0,
      timeout: 0,
      networkError: 0,
      otherError: 0,
      minLatency: Infinity,
      maxLatency: 0,
      avgLatency: 0,
      totalLatency: 0,
    },
  };

  const startTime = Date.now();
  const endTime = startTime + scenarioConfig.duration * 1000;

  if (scenarioConfig.rpm) {
    const intervalMs = (60 / scenarioConfig.rpm) * 1000;

    while (Date.now() < endTime) {
      const reqStart = Date.now();
      const result = await chatRequest(`测试消息 ${scenarioResult.summary.total + 1}`);

      scenarioResult.requests.push({
        index: scenarioResult.summary.total + 1,
        timestamp: new Date().toISOString(),
        ...result,
      });

      updateSummary(scenarioResult.summary, result);
      printProgress(scenarioResult.summary, name);

      const elapsed = Date.now() - reqStart;
      const waitTime = Math.max(0, intervalMs - elapsed);
      if (Date.now() + waitTime < endTime) {
        await sleep(waitTime);
      }
    }
  }

  if (scenarioConfig.concurrency) {
    const limiter = new RateLimiter(scenarioConfig.concurrency, 1);

    while (Date.now() < endTime) {
      await limiter.acquire();

      const index = scenarioResult.summary.total + 1;
      const promise = chatRequest(`并发测试消息 ${index}`).then((result) => {
        scenarioResult.requests.push({
          index,
          timestamp: new Date().toISOString(),
          ...result,
        });
        updateSummary(scenarioResult.summary, result);
      });

      if (scenarioResult.summary.total % 10 === 0) {
        printProgress(scenarioResult.summary, name);
      }
    }

    await sleep(2000);
  }

  finalizeSummary(scenarioResult.summary);
  scenarioResult.endTime = new Date().toISOString();
  results.scenarios.push(scenarioResult);

  printScenarioReport(scenarioResult);
  return scenarioResult;
}

function updateSummary(summary, result) {
  summary.total++;
  if (result.statusCode >= 200 && result.statusCode < 300) {
    summary.success++;
  } else if (result.statusCode === 429) {
    summary.rateLimited++;
  } else if (result.statusCode >= 500) {
    summary.serverError++;
  } else if (result.statusCode === 408 || result.statusCode === 0) {
    if (result.error && result.error.includes('timeout')) {
      summary.timeout++;
    } else {
      summary.networkError++;
    }
  } else if (result.statusCode >= 400) {
    summary.otherError++;
  } else {
    summary.otherError++;
  }

  if (result.latency > 0) {
    summary.totalLatency += result.latency;
    summary.minLatency = Math.min(summary.minLatency, result.latency);
    summary.maxLatency = Math.max(summary.maxLatency, result.latency);
  }
}

function finalizeSummary(summary) {
  if (summary.total > 0) {
    summary.avgLatency = Math.round(summary.totalLatency / summary.total);
  }
  if (summary.minLatency === Infinity) summary.minLatency = 0;
  summary.successRate = summary.total > 0 ? ((summary.success / summary.total) * 100).toFixed(1) : 0;
  summary.rateLimitRate = summary.total > 0 ? ((summary.rateLimited / summary.total) * 100).toFixed(1) : 0;
  summary.actualRPM = summary.total > 0 ? ((summary.total / (summary.duration || 60)) * 60).toFixed(1) : 0;
}

function printProgress(summary, name) {
  const rateLimitCount = summary.rateLimited;
  const flag = rateLimitCount > 0 ? ` 🔴限流:${rateLimitCount}` : '';
  process.stdout.write(`\r  [${name}] 总:${summary.total} 成功:${summary.success} 限流:${summary.rateLimited} 错误:${summary.serverError + summary.otherError + summary.timeout + summary.networkError}${flag}`);
}

function printScenarioReport(scenario) {
  const s = scenario.summary;
  console.log(`\n`);
  console.log(`  ┌─────────────────────────────────────────┐`);
  console.log(`  │  场景: ${scenario.name.padEnd(33)}│`);
  console.log(`  ├─────────────────────────────────────────┤`);
  console.log(`  │  总请求数: ${String(s.total).padStart(5)}    成功率: ${(s.successRate + '%').padStart(6)} │`);
  console.log(`  │  限流(429): ${String(s.rateLimited).padStart(5)}   限流率: ${(s.rateLimitRate + '%').padStart(6)} │`);
  console.log(`  │  服务错误: ${String(s.serverError).padStart(5)}   网络错误: ${String(s.networkError).padStart(5)}  │`);
  console.log(`  │  最小延迟: ${String(s.minLatency + 'ms').padStart(6)}  最大延迟: ${(s.maxLatency + 'ms').padStart(6)} │`);
  console.log(`  │  平均延迟: ${String(s.avgLatency + 'ms').padStart(6)}  实际RPM: ${String(s.actualRPM).padStart(6)} │`);
  console.log(`  └─────────────────────────────────────────┘`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Coze Web SDK / API 调用限制系统性验证工具        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n测试 ID: ${results.testId}`);
  console.log(`Bot ID: ${botId}`);
  console.log(`API 地址: ${baseUrl}`);

  console.log('\n[Phase 0] 预热 - 发送少量请求验证连通性...');
  for (let i = 1; i <= config.test.warmUpCount; i++) {
    const result = await chatRequest(`预热测试 ${i}`);
    const status = result.statusCode === 200 ? '✅' : '❌';
    const rateInfo = result.statusCode === 429 ? ' (被限流!)' : '';
    console.log(`  预热 ${i}/${config.test.warmUpCount}: ${status} HTTP ${result.statusCode} ${result.latency}ms${rateInfo}`);
    if (result.statusCode === 429) {
      console.log('  提前检测到限流! 建议降低测试频率或等待限流窗口重置。');
    }
    await sleep(config.test.singleCallDelay);
  }

  const scenarioOrder = ['lowRPM', 'normalRPM', 'highRPM', 'burstRPM'];

  for (const name of scenarioOrder) {
    const scenarioConfig = config.test.scenarios[name];
    if (scenarioConfig) {
      const report = await runScenario(name, scenarioConfig);

      if (name === 'burstRPM' && report.summary.rateLimited > 0) {
        console.log('\n[Phase 2] 检测到限流阈值! 执行恢复等待测试...');
        console.log('  等待 65 秒后重试，验证限流窗口重置...');
        await sleep(65000);

        console.log('  验证请求:');
        const verifyResult = await chatRequest('限流恢复验证');
        const verifyStatus = verifyResult.statusCode === 200 ? '✅ 限流已恢复' : '❌ 仍在限流';
        console.log(`  ${verifyStatus} HTTP ${verifyResult.statusCode} ${verifyResult.latency}ms`);
      }
    }
  }

  console.log('\n[Phase 3] 并发场景测试...');
  await runScenario('concurrent', config.test.scenarios.concurrent);

  const reportPath = path.join(__dirname, `test-report-${results.testId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存至: ${reportPath}`);

  printFinalSummary();
}

function printFinalSummary() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║                   📊 最终测试汇总                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  results.scenarios.forEach((scenario) => {
    const s = scenario.summary;
    console.log(`\n  [${scenario.name}]`);
    console.log(`    请求:${s.total} | 成功:${s.success} | 429限流:${s.rateLimited} | 错误:${s.serverError + s.otherError}`);
    console.log(`    成功率:${s.successRate}% | 限流率:${s.rateLimitRate}% | 延迟:${s.minLatency}-${s.maxLatency}ms(avg:${s.avgLatency}ms)`);

    if (s.rateLimited > 0) {
      const first429 = scenario.requests.find((r) => r.statusCode === 429);
      if (first429) {
        console.log(`    ⚠️ 首次 429 出现在第 ${first429.index} 个请求 (${first429.timestamp})`);
      }
    }
  });
}

process.on('SIGINT', () => {
  console.log('\n\n测试被中断。正在保存已收集的数据...');
  const reportPath = path.join(__dirname, `test-report-interrupted-${results.testId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`部分报告已保存至: ${reportPath}`);
  process.exit(0);
});

main().catch((err) => {
  console.error('测试异常:', err);
  process.exit(1);
});