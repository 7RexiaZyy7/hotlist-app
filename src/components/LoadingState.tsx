import { useEffect, useState } from 'react';

interface LoadingStateProps {
  steps?: string[];
  currentStep?: number;
}

export function LoadingState({ steps, currentStep }: LoadingStateProps) {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setDotCount(d => (d + 1) % 4), 500);
    return () => clearInterval(timer);
  }, []);

  const defaultSteps = ['正在分析需求', '正在调用 AI 模型', '正在生成内容'];
  const activeSteps = steps || defaultSteps;
  const activeStep = currentStep ?? Math.min(2, activeSteps.length - 1);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-orange-500/20 flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-ping opacity-75" />
      </div>

      <div className="text-center space-y-3">
        <p className="text-lg font-medium text-white">
          {activeSteps[activeStep]}{'.'.repeat(dotCount)}
        </p>
        <div className="flex items-center gap-2 justify-center">
          {activeSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < activeStep ? 'bg-success scale-100' :
                i === activeStep ? 'bg-accent scale-125 animate-pulse' :
                'bg-gray-600 scale-100'
              }`} />
              {i < activeSteps.length - 1 && (
                <div className={`w-8 h-0.5 rounded transition-all duration-300 ${
                  i < activeStep ? 'bg-success' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">首次请求可能需要 10-30 秒</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-gray-700/50">
          {icon}
        </div>
        <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-accent/5 animate-pulse" />
      </div>
      <p className="text-lg font-medium text-gray-300 mb-1">{title}</p>
      <p className="text-sm text-gray-500 mb-6 max-w-xs text-center">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2 bg-gradient-to-r from-accent to-orange-500 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
