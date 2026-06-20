import { describe, expect, it } from "vitest"

import {
  calculateCurrentStreakDays,
  calculateProgress,
  getGoalTasks,
} from "@/lib/progress"
import type { FocusTask } from "@/lib/domain"

const tasks: FocusTask[] = [
  {
    id: "2",
    goalId: "goal",
    title: "Second",
    notes: "",
    effort: "S",
    dueDate: "2026-06-18",
    status: "todo",
    sortOrder: 20,
  },
  {
    id: "1",
    goalId: "goal",
    title: "First",
    notes: "",
    effort: "M",
    dueDate: "2026-06-17",
    status: "done",
    sortOrder: 10,
  },
]

describe("progress helpers", () => {
  it("sorts tasks by sort order", () => {
    expect(getGoalTasks("goal", tasks).map((task) => task.id)).toEqual([
      "1",
      "2",
    ])
  })

  it("calculates rounded completion percentage", () => {
    expect(calculateProgress(tasks)).toBe(50)
  })

  it("returns zero for an empty task list", () => {
    expect(calculateProgress([])).toBe(0)
  })

  it("calculates the current completed-day streak from task due dates", () => {
    expect(
      calculateCurrentStreakDays([
        {
          ...tasks[0],
          id: "done-1",
          dueDate: "2026-06-17",
          status: "done",
        },
        {
          ...tasks[0],
          id: "done-2",
          dueDate: "2026-06-18",
          status: "done",
        },
        {
          ...tasks[0],
          id: "done-3",
          dueDate: "2026-06-20",
          status: "done",
        },
        {
          ...tasks[0],
          id: "ignored-todo",
          dueDate: "2026-06-19",
          status: "todo",
        },
      ]),
    ).toBe(1)
  })

  it("ignores malformed due dates in streak calculation", () => {
    expect(
      calculateCurrentStreakDays([
        {
          ...tasks[0],
          id: "malformed",
          dueDate: "tomorrow",
          status: "done",
        },
      ]),
    ).toBe(0)
  })
})
