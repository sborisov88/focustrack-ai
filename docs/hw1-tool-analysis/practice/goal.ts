export type TaskStatus = 'pending' | 'done' | 'skipped';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
}
