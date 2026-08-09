/**
 * iOS Safari overlays bottom chrome that is often NOT reflected in
 * env(safe-area-inset-bottom). Size the app to the visual viewport and expose
 * any remaining bottom inset so tldraw's --tl-sab padding clears it.
 */
export function installIosViewportInsets() {
	const root = document.documentElement

	const update = () => {
		const vv = window.visualViewport
		const isMobileLike =
			window.matchMedia('(max-width: 768px)').matches ||
			window.matchMedia('(pointer: coarse)').matches

		if (vv) {
			root.style.setProperty('--app-height', `${Math.round(vv.height)}px`)
			root.style.setProperty('--app-top', `${Math.round(vv.offsetTop)}px`)

			// Distance from the visual viewport's bottom to the layout viewport's bottom.
			const chromeBottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
			// Floor: when Safari reports no gap but the home-indicator / bar still
			// eats taps, keep tools clear on phone-sized viewports.
			const inset = isMobileLike ? Math.max(chromeBottom, 48) : chromeBottom
			root.style.setProperty('--browser-chrome-bottom', `${Math.round(inset)}px`)
			return
		}

		root.style.setProperty('--app-height', isMobileLike ? '100svh' : '100%')
		root.style.setProperty('--app-top', '0px')
		root.style.setProperty('--browser-chrome-bottom', isMobileLike ? '48px' : '0px')
	}

	update()

	window.visualViewport?.addEventListener('resize', update)
	window.visualViewport?.addEventListener('scroll', update)
	window.addEventListener('resize', update)
	window.addEventListener('orientationchange', update)

	return () => {
		window.visualViewport?.removeEventListener('resize', update)
		window.visualViewport?.removeEventListener('scroll', update)
		window.removeEventListener('resize', update)
		window.removeEventListener('orientationchange', update)
	}
}
