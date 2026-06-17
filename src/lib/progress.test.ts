import { describe, expect, it } from "vitest"

import { calculateProgress, getGoalTasks } from "@/lib/progress"
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
})
