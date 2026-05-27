import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { handleOAuthCallback, setUserId, getOAuthStatus } from '../services/cozeApi';
import { LogIn, AlertCircle } from 'lucide-react';

export function AuthCallback() {
  const { setAuth, showToast } = useAppStore();
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg('用户取消了授权');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('未收到授权码');
      return;
    }

    (async () => {
      try {
        const result = await handleOAuthCallback(code);
        let uid = result.uid || '';
        if (result.ok && !uid) {
          try {
            const status = await getOAuthStatus();
            if (status.loggedIn && status.uid) uid = status.uid;
          } catch {}
        }
        if (result.ok && uid) {
          setAuth(uid, result.access_token || '');
          setUserId(uid);
          showToast('Coze 账号已绑定');
          setStatus('done');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          setStatus('error');
          const debugInfo = result.debug ? '\n[调试] ' + JSON.stringify(result.debug) : '';
          setErrorMsg((result.error || '登录失败，请重试') + debugInfo);
        }
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || '登录出错');
      }
    })();
  }, [setAuth, showToast]);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse">
              <LogIn className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-heading-m text-text-primary mb-2">正在登录</h2>
            <p className="text-body-sm text-text-secondary">绑定 Coze 账号中...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-success/20 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-heading-m text-text-primary mb-2">登录成功</h2>
            <p className="text-body-sm text-text-secondary">即将跳转回首页</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-error/10 border border-error/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <h2 className="text-heading-m text-error mb-2">登录失败</h2>
            <p className="text-body-sm text-text-secondary mb-6">{errorMsg}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              返回首页
            </button>
          </>
        )}
      </div>
    </div>
  );
}
