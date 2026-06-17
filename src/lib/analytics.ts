type AnalyticsEvent = {
  name: string
  params?: Record<string, string | number | boolean>
}

type YandexMetrika = (
  counterId: number,
  method: "reachGoal",
  target: string,
  params?: AnalyticsEvent["params"],
) => void

declare global {
  interface Window {
    ym?: YandexMetrika
  }
}

const yandexCounterId = Number(import.meta.env.VITE_YANDEX_METRIKA_ID ?? 0)

export function trackEvent({ name, params }: AnalyticsEvent) {
  if (Number.isFinite(yandexCounterId) && yandexCounterId > 0 && window.ym) {
    window.ym(yandexCounterId, "reachGoal", name, params)
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", name, params ?? {})
  }
}
