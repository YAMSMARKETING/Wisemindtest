import { useEffect } from 'react'
import { useToasts } from 'tldraw'
import { setToastHandler } from './toastBridge'

/** Mount inside Tldraw UI tree so side-effects can fire native toasts. */
export function ToastBridge() {
	const { addToast } = useToasts()

	useEffect(() => {
		setToastHandler((toast) => {
			addToast({
				title: toast.title,
				description: toast.description,
				severity: toast.severity ?? 'info',
			})
		})
		return () => setToastHandler(null)
	}, [addToast])

	return null
}
