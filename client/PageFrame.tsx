import {
	COLUMN_COUNT,
	COLUMN_WIDTH,
	PAGE_HEIGHT,
	PAGE_ORIGIN,
	PAGE_WIDTH,
} from './pageGeometry'

/**
 * Non-interactive page frame + column guides drawn behind shapes (OnTheCanvas).
 * Print master is SVG of this frame; guides are compose-time only.
 */
export function PageFrame() {
	const columns = Array.from({ length: COLUMN_COUNT }, (_, i) => i)

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
			{/* Page surface */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: 'linear-gradient(165deg, #fbf8f2 0%, #f3eee4 55%, #ebe4d6 100%)',
					boxShadow: '0 0 0 2px rgba(255,255,255,0.35), 0 24px 80px rgba(0,0,0,0.45)',
				}}
			/>

			{/* Column guides */}
			{columns.map((i) => (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: i * COLUMN_WIDTH,
						top: 0,
						width: COLUMN_WIDTH,
						height: '100%',
						borderRight: i < COLUMN_COUNT - 1 ? '1px solid rgba(40, 32, 20, 0.08)' : undefined,
						boxSizing: 'border-box',
					}}
				/>
			))}

			{/* Outer rule */}
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
				Fayetteville Scrapbook · {PAGE_WIDTH}×{PAGE_HEIGHT} · {COLUMN_COUNT} cols
			</div>
		</div>
	)
}
