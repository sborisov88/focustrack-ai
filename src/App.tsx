import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react"

import { FocusTrackDashboard } from "@/features/dashboard/focustrack-dashboard"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

// Additive UI-concept showcase, code-split so it never enters the main
// dashboard bundle. Reachable only at /concepts; the production app is untouched.
const ConceptsShowcase = lazy(() =>
  import("@/features/concepts/concepts-showcase").then((module) => ({
    default: module.ConceptsShowcase,
  })),
)

function isConceptsRoute() {
  return globalThis.location?.pathname?.startsWith("/concepts") ?? false
}
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ErrorBoundaryState = {
  error: Error | null
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("FocusTrack AI UI error", { error, errorInfo })
  }

  render() {
    if (this.state.error) {
      return (
        <main className="bg-background flex min-h-svh items-center justify-center p-4">
          <Card className="max-w-lg" data-testid="app-error-boundary">
            <CardHeader>
              <CardTitle>Интерфейс временно недоступен</CardTitle>
              <CardDescription>
                FocusTrack AI поймал ошибку рендера. Обновите экран, чтобы
                перезапустить рабочее пространство.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={() => globalThis.location.reload()}
              >
                Обновить
              </Button>
            </CardContent>
          </Card>
        </main>
      )
    }

    return this.props.children
  }
}

export default function App() {
  return (
    <TooltipProvider>
      <AppErrorBoundary>
        {isConceptsRoute() ? (
          <Suspense
            fallback={
              <div className="bg-background text-muted-foreground flex min-h-svh items-center justify-center p-4 text-sm">
                Загрузка концепций…
              </div>
            }
          >
            <ConceptsShowcase />
          </Suspense>
        ) : (
          <FocusTrackDashboard />
        )}
      </AppErrorBoundary>
      <Toaster />
    </TooltipProvider>
  )
}
