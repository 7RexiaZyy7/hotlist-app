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
      {/* Perplexity-style skeleton shimmer */}
      <div className="skeleton w-12 h-12 rounded-lg mb-6" />

      <p className="text-body text-text-primary mb-4">
        {activeSteps[activeStep]}{'.'.repeat(dotCount)}
      </p>

      <div className="flex items-center gap-2">
        {activeSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i < activeStep ? 'bg-success' :
              i === activeStep ? 'bg-accent' :
              'bg-bg-elevated'
            }`} />
            {i < activeSteps.length - 1 && (
              <div className={`w-6 h-px rounded transition-all duration-200 ${
                i < activeStep ? 'bg-success' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      <p className="text-caption text-text-tertiary mt-4">首次请求可能需要 10-30 秒</p>
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
    <div className="flex-1 flex flex-col items-center justify-center py-16 animate-fadeIn">
      <div className="text-text-tertiary mb-4">
        {icon}
      </div>
      <p className="text-body font-semibold text-text-primary mb-1">{title}</p>
      <p className="text-body-sm text-text-tertiary mb-6 max-w-xs text-center">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
