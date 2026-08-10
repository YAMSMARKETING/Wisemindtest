type ToastPayload = { title: string; description?: string; severity?: 'success' | 'info' | 'warning' | 'error' }

type ToastHandler = (toast: ToastPayload) => void

let handler: ToastHandler | null = null

export function setToastHandler(next: ToastHandler | null) {
	handler = next
}

export function showToast(toast: ToastPayload) {
	if (handler) {
		handler(toast)
		return
	}
	// Fallback when UI toast bridge isn't mounted yet.
	console.info(`[toast] ${toast.title}${toast.description ? ` — ${toast.description}` : ''}`)
}
