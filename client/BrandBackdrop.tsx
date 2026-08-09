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
				height: size,
				pointerEvents: 'none',
				userSelect: 'none',
				opacity: 0.28,
				backgroundImage: 'url(/brand-mark.png)',
				backgroundRepeat: 'no-repeat',
				backgroundPosition: 'center',
				backgroundSize: 'contain',
			}}
		/>
	)
}
