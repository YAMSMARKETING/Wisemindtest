export type ContributorRecord = {
	ownerKey: string
	name: string | null
	handle: string | null
	displayName: string
	createdAt: number
	updatedAt: number
}

export type BanRecord = {
	ownerKey?: string
	handle?: string
	displayName?: string
	reason?: string
	bannedAt: number
}

export type ModerationState = {
	contributors: Record<string, ContributorRecord>
	bans: BanRecord[]
}

const MODERATION_KEY = 'scrapbook-moderation'

export async function loadModeration(storage: DurableObjectStorage): Promise<ModerationState> {
	const existing = await storage.get<ModerationState>(MODERATION_KEY)
	return existing ?? { contributors: {}, bans: [] }
}

export async function saveModeration(storage: DurableObjectStorage, state: ModerationState) {
	await storage.put(MODERATION_KEY, state)
}

function normalizeHandle(handle: string | null | undefined) {
	if (!handle) return null
	return handle.trim().replace(/^@+/, '').toLowerCase() || null
}

export function isBanned(
	state: ModerationState,
	opts: { ownerKey?: string | null; handle?: string | null; displayName?: string | null }
) {
	const handle = normalizeHandle(opts.handle)
	const display = opts.displayName?.trim().toLowerCase() || null
	return state.bans.some((ban) => {
		if (opts.ownerKey && ban.ownerKey && ban.ownerKey === opts.ownerKey) return true
		const banHandle = normalizeHandle(ban.handle)
		if (handle && banHandle && handle === banHandle) return true
		if (display && ban.displayName && display === ban.displayName.trim().toLowerCase()) return true
		// Also match @handle style displayName bans against handle
		if (handle && ban.displayName) {
			const banDisplay = ban.displayName.trim().toLowerCase().replace(/^@+/, '')
			if (banDisplay === handle) return true
		}
		return false
	})
}

export function registerContributor(
	state: ModerationState,
	input: {
		ownerKey: string
		name?: string | null
		handle?: string | null
		displayName: string
	},
	now = Date.now()
): { ok: true; state: ModerationState; contributor: ContributorRecord } | { ok: false; error: string; code: number } {
	if (!input.ownerKey) return { ok: false, error: 'Missing ownerKey', code: 400 }
	if (!input.displayName?.trim()) return { ok: false, error: 'Missing displayName', code: 400 }

	if (isBanned(state, { ownerKey: input.ownerKey, handle: input.handle, displayName: input.displayName })) {
		return { ok: false, error: 'You are banned from this scrapbook', code: 403 }
	}

	const prev = state.contributors[input.ownerKey]
	const contributor: ContributorRecord = {
		ownerKey: input.ownerKey,
		name: input.name?.trim() || null,
		handle: normalizeHandle(input.handle),
		displayName: input.displayName.trim(),
		createdAt: prev?.createdAt ?? now,
		updatedAt: now,
	}

	return {
		ok: true,
		contributor,
		state: {
			...state,
			contributors: { ...state.contributors, [input.ownerKey]: contributor },
		},
	}
}

export function banContributor(
	state: ModerationState,
	input: {
		ownerKey?: string
		handle?: string
		displayName?: string
		reason?: string
	},
	now = Date.now()
): { ok: true; state: ModerationState } | { ok: false; error: string; code: number } {
	if (!input.ownerKey && !input.handle && !input.displayName) {
		return { ok: false, error: 'Provide ownerKey, handle, or displayName to ban', code: 400 }
	}

	const nextBan: BanRecord = {
		ownerKey: input.ownerKey || undefined,
		handle: normalizeHandle(input.handle) || undefined,
		displayName: input.displayName?.trim() || undefined,
		reason: input.reason?.trim() || undefined,
		bannedAt: now,
	}

	// Dedupe similar bans
	const bans = state.bans.filter((ban) => {
		if (nextBan.ownerKey && ban.ownerKey === nextBan.ownerKey) return false
		if (nextBan.handle && normalizeHandle(ban.handle) === nextBan.handle) return false
		return true
	})

	return {
		ok: true,
		state: { ...state, bans: [...bans, nextBan] },
	}
}

export function unbanContributor(
	state: ModerationState,
	input: { ownerKey?: string; handle?: string }
): ModerationState {
	const handle = normalizeHandle(input.handle)
	return {
		...state,
		bans: state.bans.filter((ban) => {
			if (input.ownerKey && ban.ownerKey === input.ownerKey) return false
			if (handle && normalizeHandle(ban.handle) === handle) return false
			return true
		}),
	}
}

export function clearModerationContributors(state: ModerationState): ModerationState {
	return { ...state, contributors: {} }
}
