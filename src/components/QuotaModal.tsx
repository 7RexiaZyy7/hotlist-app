import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { QuotaInfo, checkUserQuota } from '../services/cozeApi';

interface Props {
  quota: QuotaInfo;
  onClose: () => void;
  onLogin: () => void;
}

function getAfdianUrl(userId: string) {
  const base = 'https://afdian.com/a/rexia';
  if (!userId) return base;
  return `${base}?custom_order_id=${encodeURIComponent(userId)}`;
}

export default function QuotaModal({ quota, onClose, onLogin }: Props) {
  const cozeUid = useAppStore((s) => s.cozeUid);
  const setQuota = useAppStore((s) => s.setQuota);
  const afdianUrl = getAfdianUrl(cozeUid);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isAnon = quota.tier === 'anon';
  const isPro = quota.tier === 'pro';

  async function handleCheckPayment() {
    if (!cozeUid) return;
    setChecking(true);
    try {
      const r = await fetch('/api/proxy?action=afdian_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': cozeUid },
        body: JSON.stringify({ user_id: cozeUid }),
      });
      const data = await r.json();
      if (data.tier === 'pro') {
        const newQuota = await checkUserQuota();
        setQuota(newQuota);
      }
    } catch {}
    setChecking(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors text-lg">✕</button>

        <div className="text-center mb-5">
          <div className="text-4xl mb-2">{quota.allowed ? '⚡' : '🚫'}</div>
          <h3 className="text-lg font-bold text-white">
            {quota.allowed ? '额度充足' : '今日额度已用完'}
          </h3>
        </div>

        <div className="mb-5 rounded-xl bg-white/5 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">已使用</span>
            <span className="text-white font-medium">{quota.used} / {quota.limit === 9999 ? '∞' : quota.limit}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quota.limit === 9999 ? 5 : Math.min(100, (quota.used / quota.limit) * 100)}%`,
                backgroundColor: quota.remaining <= 2 ? '#ef4444' : quota.remaining <= 5 ? '#f59e0b' : '#6366f1',
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-white/40">
            <span>{isAnon ? '游客模式' : isPro ? 'Pro 会员' : '免费用户'}</span>
            <span>剩余 {quota.remaining} 次</span>
          </div>
        </div>

        {!quota.allowed && (
          <div className="space-y-3">
            {isAnon && (
              <>
                <button
                  onClick={onLogin}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                >
                  登录获取更多额度 (15次/天)
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 rounded-xl text-white/50 hover:text-white/80 text-sm transition-colors"
                >
                  继续体验
                </button>
              </>
            )}
            {!isAnon && !isPro && (
              <>
                <button
                  onClick={() => window.open(afdianUrl, '_blank')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                >
                  升级 Pro 无限使用 🚀
                </button>
                <button
                  onClick={handleCheckPayment}
                  disabled={checking}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-sm transition-colors disabled:opacity-50"
                >
                  {checking ? '检测中...' : '已付款？点击刷新状态'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 rounded-xl text-white/50 hover:text-white/80 text-sm transition-colors"
                >
                  明天再来
                </button>
              </>
            )}
            {isPro && (
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-sm transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        )}

        {quota.allowed && quota.remaining <= 3 && !isPro && (
          <div className="space-y-3">
            <p className="text-center text-sm text-amber-400">
              ⚠️ 今日仅剩 {quota.remaining} 次使用机会
            </p>
            {!isAnon && (
              <button
                onClick={() => window.open(afdianUrl, '_blank')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                升级 Pro 无限使用
              </button>
            )}
            {isAnon && (
              <button
                onClick={onLogin}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                登录获取更多额度
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-2 text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              知道了
            </button>
          </div>
        )}

        {quota.allowed && quota.remaining > 3 && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-sm transition-colors"
          >
            继续使用
          </button>
        )}

        {/* {cozeUid && !isPro && (
          <button
            onClick={async () => {
              try {
                const r = await fetch('/api/proxy?action=tier_set', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ user_id: cozeUid, tier: 'pro', days: 1 }),
                });
                const data = await r.json();
                if (data.ok) {
                  const newQuota = await checkUserQuota();
                  setQuota(newQuota);
                }
              } catch {}
            }}
            className="w-full py-2 rounded-xl text-white/20 hover:text-white/40 text-xs transition-colors"
          >
            🧪 模拟升级Pro（测试用，1天有效）
          </button>
        )} */}
      </div>
    </div>
  );
}
