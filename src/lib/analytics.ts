type AnalyticsEvent = {
  name: string
  params?: Record<string, string | number | boolean>
}

type YandexMetrikaParams = Record<string, unknown>

interface YandexMetrika {
  (counterId: number, method: "init", params?: YandexMetrikaParams): void
  (
    counterId: number,
    method: "reachGoal",
    target: string,
    params?: AnalyticsEvent["params"],
  ): void
  a?: unknown[][]
  l?: number
}

declare global {
  interface Window {
    ym?: YandexMetrika
  }
}

const yandexCounterId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID ?? 0)

let initialized = false

// Подгружает официальный tag.js Яндекс.Метрики и определяет window.ym.
// Без этого шага reachGoal-события из trackEvent не уходят наружу.
function loadMetrikaTag() {
  if (!window.ym) {
    const queue: unknown[][] = []
    const stub = function (...args: unknown[]) {
      queue.push(args)
    } as unknown as YandexMetrika
    stub.a = queue
    stub.l = Number(new Date())
    window.ym = stub
  }

  const firstScript = document.getElementsByTagName("script")[0]
  const tag = document.createElement("script")
  tag.async = true
  tag.src = "https://mc.yandex.ru/metrika/tag.js"
  firstScript?.parentNode?.insertBefore(tag, firstScript)
}

// Инициализирует аналитику. Активна только когда задан VITE_YANDEX_METRIKA_ID
// (> 0). Безопасно вызывается на сервере/в тестах (нет window — no-op).
export function initAnalytics() {
  if (initialized) {
    return
  }

  if (!(Number.isFinite(yandexCounterId) && yandexCounterId > 0)) {
    return
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return
  }

  initialized = true
  loadMetrikaTag()
  window.ym?.(yandexCounterId, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
  })
}

export function trackEvent({ name, params }: AnalyticsEvent) {
  if (Number.isFinite(yandexCounterId) && yandexCounterId > 0 && window.ym) {
    window.ym(yandexCounterId, "reachGoal", name, params)
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", name, params ?? {})
  }
}
