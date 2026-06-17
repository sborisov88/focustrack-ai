import type { Goal } from './goal';
import { calculateGoalProgress } from './progress';

interface GoalCardProps {
  goal: Goal;
  onOpen?: (goalId: string) => void;
}

export function GoalCard({ goal, onOpen }: GoalCardProps) {
  const progress = calculateGoalProgress(goal.tasks);

  return (
    <article
      className="goal-card"
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '360px',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>{goal.title}</h3>

      {goal.description ? (
        <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '14px' }}>
          {goal.description}
        </p>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '8px',
          background: '#f1f5f9',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#3b82f6',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{progress}%</span>
        {onOpen ? (
          <button type="button" onClick={() => onOpen(goal.id)}>
            Открыть
          </button>
        ) : null}
      </div>
    </article>
  );
}
