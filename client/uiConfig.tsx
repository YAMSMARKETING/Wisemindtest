import {
	AssetToolbarItem,
	ArrowToolbarItem,
	DefaultToolbar,
	DrawToolbarItem,
	EraserToolbarItem,
	HandToolbarItem,
	SelectToolbarItem,
	TextToolbarItem,
	TLComponents,
	TLUiOverrides,
} from 'tldraw'
import { PageFrame } from './PageFrame'

/** Pointer, hand, pen, eraser, arrow, text, and image. Zoom lives in NavigationPanel. */
export function CommunalToolbar() {
	return (
		<DefaultToolbar>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<EraserToolbarItem />
			<ArrowToolbarItem />
			<TextToolbarItem />
			<AssetToolbarItem />
		</DefaultToolbar>
	)
}

export const communalComponents: TLComponents = {
	Toolbar: CommunalToolbar,
	OnTheCanvas: PageFrame,
	PageMenu: null,
	MainMenu: null,
	KeyboardShortcutsDialog: null,
	HelperButtons: null,
	DebugMenu: null,
	MenuPanel: null,
	TopPanel: null,
	Minimap: null,
	SharePanel: null,
	// Keep NavigationPanel (zoom controls). Pages stay disabled via PageMenu + actions.
}

export const communalOverrides: TLUiOverrides = {
	tools(_editor, tools) {
		const allowed = new Set(['select', 'hand', 'draw', 'eraser', 'arrow', 'text', 'asset'])
		for (const id of Object.keys(tools)) {
			if (!allowed.has(id)) delete tools[id]
		}
		return tools
	},
	actions(_editor, actions) {
		// Block multi-page actions; keep zoom actions.
		const blocked = [
			'insert-page',
			'create-page',
			'duplicate-page',
			'move-to-new-page',
			'next-page',
			'previous-page',
			'delete-page',
			'rename-page',
		]
		for (const id of blocked) {
			delete actions[id]
		}
		return actions
	},
}
