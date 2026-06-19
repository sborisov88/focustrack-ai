import { useState } from "react"

import { useMountEffect } from "@/hooks/use-mount-effect"
import { cn } from "@/lib/utils"

import "./concepts.css"
import { CompassConcept } from "./compass/compass-concept"
import { MissionConcept } from "./mission/mission-concept"
import { JournalConcept } from "./journal/journal-concept"

/**
 * UI-concept showcase, mounted additively at /concepts (see src/App.tsx).
 * Lives entirely outside the production dashboard router and its e2e testids,
 * so nothing here can affect the live Дашборд/План/Заметки/Обзоры flow.
 */

type ConceptKey = "compass" | "mission" | "journal"

type ConceptEntry = {
  key: ConceptKey
  path: string
  /** Built-app concept name. */
  name: string
  /** Maps to the original prose concept name. */
  alias: string
  /** scope class from concepts.css */
  scope: string
  blurb: string
  Component: () => React.JSX.Element
}

const CONCEPTS: ConceptEntry[] = [
  {
    key: "compass",
    path: "/concepts/compass",
    name: "Компас",
    alias: "Minimal Focus",
    scope: "concept-compass",
    blurb: "Спокойный фокус: один курс на сегодня",
    Component: CompassConcept,
  },
  {
    key: "mission",
    path: "/concepts/mission",
    name: "Mission Control",
    alias: "Dashboard Heavy",
    scope: "concept-mission",
    blurb: "Плотная телеметрия всех целей сразу",
    Component: MissionConcept,
  },
  {
    key: "journal",
    path: "/concepts/journal",
    name: "Полевой журнал",
    alias: "Mobile Coach",
    scope: "concept-journal",
    blurb: "Тёплый нарратив: AI-коуч рядом",
    Component: JournalConcept,
  },
]

function getConceptFromPath(pathname: string): ConceptKey {
  if (pathname.startsWith("/concepts/mission")) return "mission"
  if (pathname.startsWith("/concepts/journal")) return "journal"
  return "compass"
}

function useConceptRoute() {
  const [key, setKey] = useState<ConceptKey>(() =>
    getConceptFromPath(globalThis.location?.pathname ?? "/concepts"),
  )

  useMountEffect(() => {
    const handlePopState = () =>
      setKey(getConceptFromPath(globalThis.location.pathname))
    globalThis.addEventListener("popstate", handlePopState)
    return () => globalThis.removeEventListener("popstate", handlePopState)
  })

  const select = (next: ConceptKey) => {
    const entry = CONCEPTS.find((c) => c.key === next)
    if (entry && globalThis.location.pathname !== entry.path) {
      globalThis.history.pushState(null, "", entry.path)
    }
    setKey(next)
  }

  return { key, select }
}

export function ConceptsShowcase() {
  const { key, select } = useConceptRoute()
  const active = CONCEPTS.find((c) => c.key === key) ?? CONCEPTS[0]
  const ActiveConcept = active.Component

  return (
    <div className="min-h-dvh bg-[#0c1118] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c1118]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0c1118]/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
          >
            <span aria-hidden className="text-base">◆</span>
            FocusTrack&nbsp;AI
            <span className="hidden text-xs font-normal text-slate-400 sm:inline">
              · UI-концепции
            </span>
          </a>

          <nav
            aria-label="Переключатель концепций"
            className="flex flex-1 flex-wrap items-center gap-1.5"
          >
            {CONCEPTS.map((concept, index) => {
              const isActive = concept.key === active.key
              return (
                <button
                  key={concept.key}
                  type="button"
                  onClick={() => select(concept.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1118]",
                    isActive
                      ? "bg-white text-slate-900"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "font-mono text-xs",
                      isActive ? "text-slate-500" : "text-slate-500",
                    )}
                  >
                    0{index + 1}
                  </span>
                  <span>{concept.name}</span>
                  <span
                    className={cn(
                      "hidden text-xs font-normal lg:inline",
                      isActive ? "text-slate-500" : "text-slate-500",
                    )}
                  >
                    · {concept.alias}
                  </span>
                </button>
              )
            })}
          </nav>

          <a
            href="/"
            className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1118]"
          >
            ← К продукту
          </a>
        </div>
        <p className="mx-auto max-w-7xl px-4 pb-2 text-xs text-slate-400 sm:px-6">
          {active.blurb}
        </p>
      </header>

      <main className={cn("concept-canvas min-h-dvh", active.scope)} key={active.key}>
        <ActiveConcept />
      </main>
    </div>
  )
}
