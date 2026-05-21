import { useAppStore } from '../store';
import { User, Target, PenTool, FileText, Save, RotateCcw } from 'lucide-react';

export function CreatorProfile() {
  const { userProfile, setUserProfile } = useAppStore();

  const handleSave = () => {
    alert('保存成功！');
  };

  const handleReset = () => {
    if (confirm('确定要清除所有个人信息吗？')) {
      setUserProfile({});
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-card border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-orange-500 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">创作档案</h2>
            <p className="text-sm text-gray-400">完善你的信息，让 AI 更懂你</p>
          </div>
        </div>

        {/* 核心信息 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="font-medium">核心信息（硬约束）</h3>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">账号赛道</label>
              <input
                type="text"
                value={userProfile.niche || ''}
                onChange={(e) => setUserProfile({ ...userProfile, niche: e.target.value })}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                placeholder="例如：科技数码、生活方式、职场成长..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">目标受众</label>
              <input
                type="text"
                value={userProfile.audience || ''}
                onChange={(e) => setUserProfile({ ...userProfile, audience: e.target.value })}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                placeholder="例如：20-30岁职场新人、创业者、宝妈..."
              />
            </div>
          </div>
        </div>

        {/* 扩展信息 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <PenTool className="w-4 h-4 text-accent-alt" />
            <h3 className="font-medium">扩展信息（软约束）</h3>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">作者昵称</label>
              <input
                type="text"
                value={userProfile.nickname || ''}
                onChange={(e) => setUserProfile({ ...userProfile, nickname: e.target.value })}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                placeholder="你希望怎么称呼自己..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">文风偏好</label>
              <textarea
                value={userProfile.style || ''}
                onChange={(e) => setUserProfile({ ...userProfile, style: e.target.value })}
                rows={3}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent resize-none"
                placeholder="例如：轻松幽默、专业理性、温暖治愈、犀利毒舌..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">内容形式</label>
              <input
                type="text"
                value={userProfile.contentFormat || ''}
                onChange={(e) => setUserProfile({ ...userProfile, contentFormat: e.target.value })}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                placeholder="例如：短视频脚本、公众号文章、小红书笔记..."
              />
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-gray-700 rounded-xl text-sm hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            清除信息
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent to-orange-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
