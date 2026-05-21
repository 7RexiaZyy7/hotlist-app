module.exports = {
  coze: {
    botId: 'YOUR_BOT_ID_HERE',
    token: 'YOUR_PAT_TOKEN_HERE',
    baseUrl: 'https://api.coze.cn',
  },
  test: {
    warmUpCount: 5,
    singleCallDelay: 100,
    scenarios: {
      lowRPM: { rpm: 5, duration: 120 },
      normalRPM: { rpm: 30, duration: 120 },
      highRPM: { rpm: 60, duration: 60 },
      burstRPM: { rpm: 120, duration: 30 },
      concurrent: { concurrency: 10, duration: 60 },
      limitHunt: { rpm: 60, duration: 300 },
    },
  },
};