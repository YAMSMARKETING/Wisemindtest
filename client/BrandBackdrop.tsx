/** Permanent center brand mark — page-space, non-interactive, behind drawings. */
export function BrandBackdrop() {
	const size = 520

	return (
		<div
			className="BrandBackdrop"
			aria-hidden="true"
			style={{
				position: 'absolute',
				left: -size / 2,
				top: -size / 2,
				width: size,
				height: size + 72,
				pointerEvents: 'none',
				userSelect: 'none',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-start',
				gap: 18,
			}}
		>
			<div
				style={{
					width: size,
					height: size,
					opacity: 0.28,
					backgroundImage: 'url(/brand-mark.png)',
					backgroundRepeat: 'no-repeat',
					backgroundPosition: 'center',
					backgroundSize: 'contain',
				}}
			/>
			<div
				style={{
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
		</div>
	)
}

/** Page-space bounds used to frame the logo + caption on load. */
export const BRAND_FOCUS_BOUNDS = {
	x: -300,
	y: -300,
	w: 600,
	h: 680,
} as const
