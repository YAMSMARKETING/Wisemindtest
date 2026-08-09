import { PAGE_HEIGHT, PAGE_ORIGIN, PAGE_WIDTH } from './pageGeometry'

/**
 * Non-interactive page frame drawn behind shapes (OnTheCanvas).
 * No column guides — free placement layout. SVG of this frame is the print master.
 */
export function PageFrame() {
	return (
		<div
			className="PageFrame"
			aria-hidden="true"
			style={{
				position: 'absolute',
				left: PAGE_ORIGIN.x,
				top: PAGE_ORIGIN.y,
				width: PAGE_WIDTH,
				height: PAGE_HEIGHT,
				pointerEvents: 'none',
				userSelect: 'none',
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(165deg, #fbf8f2 0%, #f3eee4 55%, #ebe4d6 100%)',
					boxShadow: '0 0 0 2px rgba(255,255,255,0.35), 0 24px 80px rgba(0,0,0,0.45)',
				}}
			/>

			<div
				style={{
					position: 'absolute',
					inset: 0,
					border: '3px solid rgba(40, 32, 20, 0.55)',
					boxSizing: 'border-box',
				}}
			/>

			<div
				style={{
					position: 'absolute',
					left: 24,
					top: 18,
					fontFamily: "'Instrument Sans', sans-serif",
					fontSize: 22,
					fontWeight: 700,
					letterSpacing: '0.04em',
					textTransform: 'uppercase',
					color: 'rgba(40, 32, 20, 0.45)',
				}}
			>
				Fayetteville Scrapbook · {PAGE_WIDTH}×{PAGE_HEIGHT}
			</div>
		</div>
	)
}
