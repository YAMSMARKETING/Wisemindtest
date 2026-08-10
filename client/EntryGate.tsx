import { FormEvent, useEffect, useState } from 'react'
import {
	storeIdentity,
	validateIdentityInput,
	type StoredIdentity,
} from './identity'

export function EntryGate({
	onJoined,
	bannedMessage,
}: {
	onJoined: (identity: StoredIdentity) => void
	bannedMessage?: string | null
}) {
	const [name, setName] = useState('')
	const [handle, setHandle] = useState('')
	const [error, setError] = useState<string | null>(bannedMessage ?? null)

	useEffect(() => {
		if (bannedMessage) setError(bannedMessage)
	}, [bannedMessage])

	function handleSubmit(event: FormEvent) {
		event.preventDefault()
		try {
			const identity = validateIdentityInput(name, handle)
			onJoined(storeIdentity(identity))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not join')
		}
	}

	return (
		<div className="InstagramGate" role="dialog" aria-modal="true" aria-labelledby="entry-gate-title">
			<form className="InstagramGate-card" onSubmit={handleSubmit}>
				<h1 id="entry-gate-title" className="InstagramGate-title">
					Leave a memory
				</h1>
				<p className="InstagramGate-copy">
					Name, Instagram, or both — at least one is required. Your credit shows on your block.
				</p>

				<label className="EntryGate-label" htmlFor="entry-name">
					Name
				</label>
				<input
					id="entry-name"
					className="EntryGate-input"
					autoComplete="nickname"
					placeholder="Optional if you add @handle"
					value={name}
					onChange={(event) => {
						setName(event.target.value)
						setError(null)
					}}
				/>

				<label className="EntryGate-label" htmlFor="entry-handle">
					Instagram
				</label>
				<div className="InstagramGate-inputRow">
					<span className="InstagramGate-at" aria-hidden="true">
						@
					</span>
					<input
						id="entry-handle"
						className="InstagramGate-input"
						autoComplete="username"
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						placeholder="Optional if you add a name"
						aria-label="Instagram handle"
						value={handle}
						onChange={(event) => {
							setHandle(event.target.value)
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
