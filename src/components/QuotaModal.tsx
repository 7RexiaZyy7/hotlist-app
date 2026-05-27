import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { QuotaInfo, checkUserQuota } from '../services/cozeApi';
import { Sparkles, Ban } from 'lucide-react';
import { clsx } from 'clsx';

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
      <div className="card mx-4 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary transition-colors text-lg leading-none">✕</button>

        <div className="text-center mb-5">
          <div className={clsx('w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center', quota.allowed ? 'bg-accent/20' : 'bg-error/10')}>
            {quota.allowed ? (
              <Sparkles className="w-6 h-6 text-accent" />
            ) : (
              <Ban className="w-6 h-6 text-error" />
            )}
          </div>
          <h3 className="text-heading-m text-text-primary">
            {quota.allowed ? '额度充足' : '今日额度已用完'}
          </h3>
        </div>

        <div className="mb-5 rounded-md bg-bg-elevated p-4">
          <div className="flex justify-between text-body-sm mb-2">
            <span className="text-text-secondary">已使用</span>
            <span className="text-text-primary font-medium">{quota.used} / {quota.limit === 9999 ? '∞' : quota.limit}</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${quota.limit === 9999 ? 5 : Math.min(100, (quota.used / quota.limit) * 100)}%`,
                backgroundColor: quota.remaining <= 2 ? '#ef4444' : quota.remaining <= 5 ? '#f59e0b' : '#a855f7',
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-caption text-text-tertiary">
            <span>{isAnon ? '游客模式' : isPro ? 'Pro 会员' : '免费用户'}</span>
            <span>剩余 {quota.remaining} 次</span>
          </div>
        </div>

        {!quota.allowed && (
          <div className="space-y-2">
            {isAnon && (
              <>
                <button onClick={onLogin} className="btn-primary w-full justify-center">
                  登录获取更多额度 (15次/天)
                </button>
                <button onClick={onClose} className="btn-ghost w-full justify-center">
                  继续体验
                </button>
              </>
            )}
            {!isAnon && !isPro && (
              <>
                <button
                  onClick={() => window.open(afdianUrl, '_blank')}
                  className="btn-primary w-full justify-center !bg-success/20 !text-success !border-success/30 hover:!bg-success/30"
                >
                  升级 Pro 无限使用
                </button>
                <button
                  onClick={handleCheckPayment}
                  disabled={checking}
                  className="btn-ghost w-full justify-center disabled:opacity-40"
                >
                  {checking ? '检测中...' : '已付款？点击刷新状态'}
                </button>
                <button onClick={onClose} className="btn-ghost w-full justify-center">
                  明天再来
                </button>
              </>
            )}
            {isPro && (
              <button onClick={onClose} className="btn-ghost w-full justify-center">
                关闭
              </button>
            )}
          </div>
        )}

        {quota.allowed && quota.remaining <= 3 && !isPro && (
          <div className="space-y-2">
            <p className="text-center text-body-sm text-warning">
              今日仅剩 {quota.remaining} 次使用机会
            </p>
            {!isAnon && (
              <button
                onClick={() => window.open(afdianUrl, '_blank')}
                className="btn-primary w-full justify-center !bg-success/20 !text-success !border-success/30 hover:!bg-success/30"
              >
                升级 Pro 无限使用
              </button>
            )}
            {isAnon && (
              <button onClick={onLogin} className="btn-primary w-full justify-center">
                登录获取更多额度
              </button>
            )}
            <button onClick={onClose} className="btn-ghost w-full justify-center">
              知道了
            </button>
          </div>
        )}

        {quota.allowed && quota.remaining > 3 && (
          <button onClick={onClose} className="btn-primary w-full justify-center">
            继续使用
          </button>
        )}
      </div>
    </div>
  );
}
