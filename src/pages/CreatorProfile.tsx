import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { User, Target, PenTool, FileText, Save, RotateCcw, Check, Hash, MessageSquare, BookOpen, Palette, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { syncUserVariables } from '../services/cozeApi';

const STORAGE_KEY = 'creator_profile';

const contentFormatOptions = [
  { id: '小红书笔记', desc: 'emoji + 分段 + 标签' },
  { id: '抖音短视频', desc: '画面 + 口播 + BGM' },
  { id: '公众号文章', desc: '深度长文' },
  { id: '微博文案', desc: '短平快 + 话题' },
  { id: 'B站视频', desc: '脚本 + 分镜' },
  { id: '知乎回答', desc: '专业深度' },
  { id: '视频号', desc: '口播 + 字幕' },
  { id: '其他', desc: '自定义格式' },
];

export function CreatorProfile() {
  const { userProfile, setUserProfile, isConnected, showToast } = useAppStore();
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [customFormat, setCustomFormat] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch {}
    }
  }, [setUserProfile]);

  const filledCount = Object.values(userProfile).filter((v): v is string => typeof v === 'string' && v.trim().length > 0).length;
  const totalFields = 5;
  const completeness = Math.round((filledCount / totalFields) * 100);

  const handleSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    if (import.meta.env.PROD && isConnected) {
      setSyncing(true);
      const ok = await syncUserVariables();
      setSyncing(false);
      if (ok) {
        setSyncDone(true);
        showToast('档案已保存并同步到云端');
      } else {
        showToast('档案已保存到本地（云端同步失败）', 'info');
      }
    } else {
      showToast('档案已保存到本地');
    }
  };

  const handleSync = async () => {
    if (!import.meta.env.PROD) {
      showToast('本地开发模式无需同步', 'info');
      return;
    }
    setSyncing(true);
    const ok = await syncUserVariables();
    setSyncing(false);
    if (ok) {
      setSyncDone(true);
      showToast('档案已同步到 Coze 云端');
    } else {
      showToast('同步失败，请稍后重试', 'info');
    }
  };

  const handleReset = () => {
    if (confirm('确定要清除所有个人信息吗？')) {
      const cleared = { niche: '', audience: '', nickname: '', style: '', contentFormat: '' };
      setUserProfile(cleared);
      localStorage.removeItem(STORAGE_KEY);
      showToast('已清除所有信息');
    }
  };

  const getInitial = () => {
    return userProfile.nickname?.[0] || userProfile.niche?.[0] || '?';
  };

  const handleFormatSelect = (id: string) => {
    if (id === '其他') {
      setCustomFormat('');
      setUserProfile({ ...userProfile, contentFormat: '' });
    } else {
      setCustomFormat('');
      setUserProfile({ ...userProfile, contentFormat: id });
    }
  };

  const handleCustomFormatChange = (value: string) => {
    setCustomFormat(value);
    if (value.trim()) {
      setUserProfile({ ...userProfile, contentFormat: value });
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="card p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center text-xl font-bold text-white font-body">
                {getInitial()}
              </div>
              {completeness === 100 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-heading-m text-text-primary">创作者档案</h2>
              <p className="text-body-sm text-text-secondary mt-0.5">
                {userProfile.nickname || '未命名创作者'}
                {userProfile.niche && ` · ${userProfile.niche}`}
              </p>
            </div>

            {/* Completeness */}
            <div className="text-right shrink-0">
              <div className="text-caption text-text-tertiary mb-1">档案完整度</div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-20 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      completeness === 100 ? 'bg-success' : completeness >= 60 ? 'bg-accent' : 'bg-text-tertiary'
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <span className={`text-body-sm font-mono font-semibold ${
                  completeness === 100 ? 'text-success' : 'text-text-secondary'
                }`}>
                  {completeness}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-3.5 h-3.5 text-accent" />
              <span className="text-caption text-text-tertiary">已填字段</span>
            </div>
            <div className="text-heading-m text-accent font-mono">{filledCount}/{totalFields}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-accent" />
              <span className="text-caption text-text-tertiary">账号赛道</span>
            </div>
            <div className="text-heading-m text-accent font-mono truncate">
              {userProfile.niche || '未设置'}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-success" />
              <span className="text-caption text-text-tertiary">内容形式</span>
            </div>
            <div className="text-heading-m text-success font-mono truncate">
              {userProfile.contentFormat || '未设置'}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6">
          {/* Core info */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">核心信息</h3>
              <span className="text-caption text-text-tertiary ml-1">（硬约束，AI 创作的基础锚点）</span>
            </div>
            <div className="grid gap-4 mt-4">
              <div>
                <label className="flex items-center gap-2 text-body-sm text-text-secondary mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  账号赛道
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={userProfile.niche || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, niche: e.target.value })}
                    className="input-field !rounded-md !pl-10"
                    placeholder="例如：科技数码、生活方式、职场成长..."
                  />
                </div>
                <p className="text-caption text-text-tertiary mt-1">你的账号所属领域，决定 AI 推荐话题的方向</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-body-sm text-text-secondary mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  目标受众
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={userProfile.audience || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, audience: e.target.value })}
                    className="input-field !rounded-md !pl-10"
                    placeholder="例如：20-30 岁职场新人、创业者、宝妈..."
                  />
                </div>
                <p className="text-caption text-text-tertiary mt-1">你希望吸引什么人？越具体，AI 越懂你的读者</p>
              </div>
            </div>
          </div>

          {/* Extended info */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <PenTool className="w-4 h-4 text-accent" />
              <h3 className="text-body font-semibold text-text-primary">扩展信息</h3>
              <span className="text-caption text-text-tertiary ml-1">（软约束，让 AI 模仿你的语气和风格）</span>
            </div>
            <div className="grid gap-4 mt-4">
              <div>
                <label className="flex items-center gap-2 text-body-sm text-text-secondary mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  作者昵称
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={userProfile.nickname || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, nickname: e.target.value })}
                    className="input-field !rounded-md !pl-10"
                    placeholder="你希望怎么称呼自己..."
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-body-sm text-text-secondary mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  文风偏好
                </label>
                <div className="relative">
                  <Palette className="absolute left-3 top-3 w-4 h-4 text-text-tertiary" />
                  <textarea
                    value={userProfile.style || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, style: e.target.value })}
                    rows={3}
                    className="input-field !rounded-md !pl-10 resize-none"
                    placeholder="例如：轻松幽默、专业理性、温暖治愈、犀利毒舌..."
                  />
                </div>
                <p className="text-caption text-text-tertiary mt-1">描述你想呈现的文字气质，可以组合多个关键词</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-body-sm text-text-secondary mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  内容形式
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {contentFormatOptions.map((pf) => {
                    const isSelected = userProfile.contentFormat === pf.id;
                    return (
                      <button
                        key={pf.id}
                        onClick={() => handleFormatSelect(pf.id)}
                        className={clsx(
                          'p-3 rounded-md border text-left transition-all duration-120',
                          isSelected
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-bg-surface hover:border-text-tertiary'
                        )}
                      >
                        <p className={`text-body-sm font-medium ${isSelected ? 'text-accent' : 'text-text-secondary'}`}>{pf.id}</p>
                        <p className="text-caption text-text-tertiary mt-0.5">{pf.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {userProfile.contentFormat === '' && !contentFormatOptions.some(o => o.id === '其他' && customFormat) && customFormat === '' ? null : null}
                {userProfile.contentFormat === '' && (
                  <input
                    type="text"
                    value={customFormat}
                    onChange={(e) => handleCustomFormatChange(e.target.value)}
                    className="input-field !rounded-md mt-2"
                    placeholder="输入自定义内容形式..."
                  />
                )}
                {userProfile.contentFormat && !contentFormatOptions.some(o => o.id === userProfile.contentFormat) && (
                  <p className="text-caption text-text-tertiary mt-1">当前自定义格式：{userProfile.contentFormat}</p>
                )}
                <p className="text-caption text-text-tertiary mt-1">选择平台后，AI 会按对应格式生成文案</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleReset}
              className="btn-ghost"
            >
              <RotateCcw className="w-4 h-4" />
              清除信息
            </button>
            {import.meta.env.PROD && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-ghost"
              >
                <Upload className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '同步中...' : syncDone ? '已同步' : '同步到云端'}
              </button>
            )}
            <button
              onClick={handleSave}
              className="btn-primary ml-auto"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? '已保存' : '保存档案'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-caption text-text-tertiary text-center pb-4">
          {import.meta.env.PROD
            ? '保存后点击「同步到云端」可将档案同步到 Coze，后续对话中 Agent 会自动读取'
            : '部署到 Vercel 后，档案可同步到 Coze 云端实现长期记忆'}
        </p>
      </div>
    </div>
  );
}
