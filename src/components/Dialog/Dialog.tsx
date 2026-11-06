import { HTMLAttributes, useId, useLayoutEffect, useRef } from 'react'

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void
  busy?: boolean
}

const dialogs: HTMLDivElement[] = []
let savedBodyOverflow = ''
const focusableSelector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Modal surface; callers keep their existing backdrop, styling and close policy. */
export default function Dialog({ children, onClose, busy = false, ...props }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const previousFocus = useRef(document.activeElement as HTMLElement | null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  const titleId = useId()
  closeRef.current = onClose
  busyRef.current = busy

  useLayoutEffect(() => {
    const restoreFocus = previousFocus.current
    const dialog = ref.current
    if (!dialog) return
    const title = dialog.querySelector<HTMLElement>('h1, h2, h3, .inv-modal__title')
    if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
      if (title) {
        if (!title.id) title.id = titleId
        dialog.setAttribute('aria-labelledby', title.id)
      } else {
        dialog.setAttribute('aria-label', 'Details')
      }
    }
    if (dialogs.length === 0) {
      savedBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    dialogs.push(dialog)
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'))
    if (!dialog.contains(document.activeElement)) (controls()[0] || dialog).focus()

    const keydown = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== dialog || event.defaultPrevented) return
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus()
      }
    }
    const containFocus = (event: FocusEvent) => {
      if (dialogs[dialogs.length - 1] === dialog && !dialog.contains(event.target as Node)) {
        (controls()[0] || dialog).focus()
      }
    }
    const contentObserver = new MutationObserver(() => {
      if (dialogs[dialogs.length - 1] === dialog && !dialog.contains(document.activeElement)) {
        (controls()[0] || dialog).focus()
      }
    })
    contentObserver.observe(dialog, { childList: true, subtree: true })
    const backdrop = dialog.parentElement
    const preventBusyDismiss = (event: MouseEvent) => {
      if (busyRef.current && event.target === backdrop) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    backdrop?.addEventListener('mousedown', preventBusyDismiss, true)
    backdrop?.addEventListener('click', preventBusyDismiss, true)
    document.addEventListener('keydown', keydown)
    document.addEventListener('focusin', containFocus)
    return () => {
      contentObserver.disconnect()
      backdrop?.removeEventListener('mousedown', preventBusyDismiss, true)
      backdrop?.removeEventListener('click', preventBusyDismiss, true)
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', containFocus)
      const index = dialogs.indexOf(dialog)
      if (index >= 0) dialogs.splice(index, 1)
      if (dialogs.length === 0) document.body.style.overflow = savedBodyOverflow
      if (restoreFocus?.isConnected) restoreFocus.focus()
    }
  }, [titleId])

  return <div {...props} onClickCapture={(event) => {
    props.onClickCapture?.(event)
    const button = (event.target as Element).closest('button')
    if (busy && button && (button.className.includes('close') || button.textContent?.trim() === 'Cancel')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }} ref={ref} role="dialog" aria-modal="true" aria-busy={busy || undefined} tabIndex={-1}>{children}</div>
}
