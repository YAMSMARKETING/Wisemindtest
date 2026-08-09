import { FormEvent, useState } from 'react'
import {
	isValidInstagramHandle,
	normalizeInstagramHandle,
	storeInstagramHandle,
} from './instagramHandle'

export function InstagramGate({ onJoined }: { onJoined: (handle: string) => void }) {
	const [value, setValue] = useState('')
	const [error, setError] = useState<string | null>(null)

	function handleSubmit(event: FormEvent) {
		event.preventDefault()
		const handle = normalizeInstagramHandle(value)
		if (!isValidInstagramHandle(handle)) {
			setError('Use letters, numbers, . or _')
			return
		}
		try {
			onJoined(storeInstagramHandle(handle))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save handle')
		}
	}

	return (
		<div className="InstagramGate" role="dialog" aria-modal="true" aria-labelledby="instagram-gate-title">
			<form className="InstagramGate-card" onSubmit={handleSubmit}>
				<h1 id="instagram-gate-title" className="InstagramGate-title">
					Enter with Instagram
				</h1>
				<p className="InstagramGate-copy">Your handle shows on your cursor.</p>
				<div className="InstagramGate-inputRow">
					<span className="InstagramGate-at" aria-hidden="true">
						@
					</span>
					<input
						id="instagram-handle"
						className="InstagramGate-input"
						autoComplete="username"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						placeholder="handle"
						aria-label="Instagram handle"
						value={value}
						onChange={(event) => {
							setValue(event.target.value)
							setError(null)
						}}
					/>
				</div>
				{error && <p className="InstagramGate-error">{error}</p>}
				<button className="InstagramGate-submit" type="submit">
					Join
				</button>
			</form>
		</div>
	)
}
