import { Navigate } from 'react-router-dom'
import { SHARED_ROOM_ID } from '../constants'

export function Root() {
	// One shared board for every visitor — no per-browser room ids.
	return <Navigate to={`/${SHARED_ROOM_ID}`} replace />
}
