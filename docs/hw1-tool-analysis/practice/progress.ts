import type { Task } from './goal';

/**
 * Возвращает процент выполненных задач (0–100).
 * Пропущенные и ожидающие задачи не считаются выполненными.
 */
export function calculateGoalProgress(tasks: Task[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  return Math.round((doneCount / tasks.length) * 100);
}
