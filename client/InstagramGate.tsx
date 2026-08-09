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
			setError('Use a valid Instagram handle (letters, numbers, . and _)')
			return
		}
		try {
			onJoined(storeInstagramHandle(handle))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save handle')
		}
	}

	return (
		<div className="InstagramGate">
			<form className="InstagramGate-card" onSubmit={handleSubmit}>
				<p className="InstagramGate-brand">Communal Whiteboard</p>
				<h1 className="InstagramGate-title">Drop your Instagram to enter</h1>
				<p className="InstagramGate-copy">Everyone on the board sees your handle with your cursor.</p>
				<label className="InstagramGate-label" htmlFor="instagram-handle">
					Instagram handle
				</label>
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
						placeholder="yourhandle"
						value={value}
						onChange={(event) => {
							setValue(event.target.value)
							setError(null)
						}}
					/>
				</div>
				{error && <p className="InstagramGate-error">{error}</p>}
				<button className="InstagramGate-submit" type="submit">
					Enter the board
				</button>
			</form>
		</div>
	)
}
