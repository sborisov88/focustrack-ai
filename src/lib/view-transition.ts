import { flushSync } from "react-dom"

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * Run a synchronous state/DOM update inside a browser View Transition when the
 * API is available, so route changes and list mutations cross-fade / morph.
 *
 * `flushSync` forces React to commit the update synchronously within the
 * transition callback, so the browser captures the post-update DOM. Falls back
 * to a plain update when View Transitions are unsupported — no animation, no
 * breakage. Call from event handlers (no effects needed).
 */
export function withViewTransition(update: () => void): void {
  const doc = globalThis.document as DocumentWithViewTransition | undefined
  if (doc && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => flushSync(update))
  } else {
    update()
  }
}
