import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { User, Target, PenTool, FileText, Save, RotateCcw, Check, Hash, MessageSquare, BookOpen, Palette } from 'lucide-react';

const STORAGE_KEY = 'creator_profile';

export function CreatorProfile() {
  const { userProfile, setUserProfile } = useAppStore();
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch {}
    }
  }, [setUserProfile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filledCount = Object.values(userProfile).filter(v => v && v.trim()).length;
  const totalFields = 5;
  const completeness = Math.round((filledCount / totalFields) * 100);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userProfile));
    setSaved(true);
    setToast('档案已保存到本地');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('确定要清除所有个人信息吗？')) {
      const cleared = { niche: '', audience: '', nickname: '', style: '', contentFormat: '' };
      setUserProfile(cleared);
      localStorage.removeItem(STORAGE_KEY);
      setToast('已清除所有信息');
    }
  };

  const getInitial = () => {
    return userProfile.nickname?.[0] || userProfile.niche?.[0] || '?';
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 transition-all duration-300">
          <div className="bg-surface border border-gray-700 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3">
            <Check className="w-4 h-4 text-success" />
            <span className="text-sm text-gray-200">{toast}</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">

        {/* 头部 - 档案概览 */}
        <div className="bg-card border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start gap-5">
            {/* 头像 */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center text-2xl font-bold text-white font-display shadow-lg shadow-accent/20">
                {getInitial()}
              </div>
              {completeness === 100 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold font-display">创作档案</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {userProfile.nickname || '未命名创作者'}
                {userProfile.niche && ` · ${userProfile.niche}`}
              </p>
            </div>

            {/* 完整度 */}
            <div className="text-right shrink-0">
              <div className="text-sm text-gray-400 mb-1">档案完整度</div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completeness === 100 ? 'bg-success' : completeness >= 60 ? 'bg-accent' : 'bg-gray-500'
                    }`}
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <span className={`text-sm font-mono font-semibold ${
                  completeness === 100 ? 'text-success' : 'text-gray-300'
                }`}>
                  {completeness}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-4 h-4 text-accent" />
              <span className="text-xs text-gray-400">已填字段</span>
            </div>
            <div className="text-xl font-bold text-accent font-mono">{filledCount}/{totalFields}</div>
          </div>
          <div className="bg-card border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-accent-alt" />
              <span className="text-xs text-gray-400">账号赛道</span>
            </div>
            <div className="text-xl font-bold text-accent-alt font-mono truncate">
              {userProfile.niche || '未设置'}
            </div>
          </div>
          <div className="bg-card border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">内容形式</span>
            </div>
            <div className="text-xl font-bold text-green-400 font-mono truncate">
              {userProfile.contentFormat || '未设置'}
            </div>
          </div>
        </div>

        {/* 编辑表单 */}
        <div className="bg-card border border-gray-800 rounded-2xl p-6">
          {/* 核心信息 */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-accent" />
              <h3 className="font-medium">核心信息</h3>
              <span className="text-xs text-gray-500 ml-1">（硬约束 · AI 创作的基础锚点）</span>
            </div>
            <div className="grid gap-5 mt-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  账号赛道
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userProfile.niche || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, niche: e.target.value })}
                    className="w-full bg-surface border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                    placeholder="例如：科技数码、生活方式、职场成长..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">你的账号所属领域，决定 AI 推荐话题的方向</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  目标受众
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userProfile.audience || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, audience: e.target.value })}
                    className="w-full bg-surface border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                    placeholder="例如：20-30岁职场新人、创业者、宝妈..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">你希望吸引什么人？越具体，AI 越懂你的读者</p>
              </div>
            </div>
          </div>

          {/* 扩展信息 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <PenTool className="w-4 h-4 text-accent-alt" />
              <h3 className="font-medium">扩展信息</h3>
              <span className="text-xs text-gray-500 ml-1">（软约束 · 让 AI 模仿你的语气和风格）</span>
            </div>
            <div className="grid gap-5 mt-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-alt" />
                  作者昵称
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userProfile.nickname || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, nickname: e.target.value })}
                    className="w-full bg-surface border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-alt transition-colors"
                    placeholder="你希望怎么称呼自己..."
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-alt" />
                  文风偏好
                </label>
                <div className="relative">
                  <Palette className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <textarea
                    value={userProfile.style || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, style: e.target.value })}
                    rows={3}
                    className="w-full bg-surface border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-alt transition-colors resize-none"
                    placeholder="例如：轻松幽默、专业理性、温暖治愈、犀利毒舌..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">描述你想呈现的文字气质，可以组合多个关键词</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-alt" />
                  内容形式
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userProfile.contentFormat || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, contentFormat: e.target.value })}
                    className="w-full bg-surface border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-alt transition-colors"
                    placeholder="例如：短视频脚本、公众号文章、小红书笔记..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">你主要创作什么媒介？AI 会按对应格式生成文案</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-surface border border-gray-700 rounded-xl text-sm hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              清除信息
            </button>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-accent to-orange-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer ml-auto"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? '已保存' : '保存档案'}
            </button>
          </div>
        </div>

        {/* 底部说明 */}
        <p className="text-xs text-gray-600 text-center pb-4">
          所有信息仅保存在本地浏览器，不会上传到服务器
        </p>
      </div>
    </div>
  );
}
