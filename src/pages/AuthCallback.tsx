import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { handleOAuthCallback } from '../services/cozeApi';
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
        if (result.ok && result.access_token && result.uid) {
          setAuth(result.uid, result.access_token);
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-gray-800 rounded-2xl p-10 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center animate-pulse">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold font-display mb-2">正在登录</h2>
            <p className="text-sm text-gray-400">绑定 Coze 账号中...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold font-display mb-2">登录成功</h2>
            <p className="text-sm text-gray-400">即将跳转回首页</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold font-display mb-2 text-red-400">登录失败</h2>
            <p className="text-sm text-gray-400 mb-6">{errorMsg}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-gradient-to-r from-accent to-orange-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              返回首页
            </button>
          </>
        )}
      </div>
    </div>
  );
}
