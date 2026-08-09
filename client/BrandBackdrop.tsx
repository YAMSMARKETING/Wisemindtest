/** Permanent center caption — page-space, non-interactive, behind drawings. */
export function BrandBackdrop() {
	return (
		<div
			className="BrandBackdrop"
			aria-hidden="true"
			style={{
				position: 'absolute',
				left: -240,
				top: -24,
				width: 480,
				height: 48,
				pointerEvents: 'none',
				userSelect: 'none',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontFamily: "'Instrument Sans', sans-serif",
				fontSize: 28,
				fontWeight: 700,
				letterSpacing: '0.02em',
				color: 'rgba(255,255,255,0.55)',
				textAlign: 'center',
				whiteSpace: 'nowrap',
			}}
		>
			Sign some shit
		</div>
	)
}

/** Page-space bounds used to frame the center caption on load. */
export const BRAND_FOCUS_BOUNDS = {
	x: -300,
	y: -200,
	w: 600,
	h: 400,
} as const
