import {
	AssetToolbarItem,
	DefaultToolbar,
	DrawToolbarItem,
	EraserToolbarItem,
	HandToolbarItem,
	SelectToolbarItem,
	TextToolbarItem,
	TLComponents,
	TLUiOverrides,
} from 'tldraw'
import { ToastBridge } from './ToastBridge'

/** Contributor toolbar: select, hand, draw, eraser, text, image. */
export function CommunalToolbar() {
	return (
		<DefaultToolbar>
			<SelectToolbarItem />
			<HandToolbarItem />
			<DrawToolbarItem />
			<EraserToolbarItem />
			<TextToolbarItem />
			<AssetToolbarItem />
		</DefaultToolbar>
	)
}

export const communalComponents: TLComponents = {
	Toolbar: CommunalToolbar,
	OnTheCanvas: null,
	HelperButtons: ToastBridge,
	PageMenu: null,
	MainMenu: null,
	KeyboardShortcutsDialog: null,
	DebugMenu: null,
	MenuPanel: null,
	TopPanel: null,
	Minimap: null,
	SharePanel: null,
}

export const communalOverrides: TLUiOverrides = {
	tools(_editor, tools) {
		const allowed = new Set(['select', 'hand', 'draw', 'eraser', 'text', 'asset'])
		for (const id of Object.keys(tools)) {
			if (!allowed.has(id)) delete tools[id]
		}
		return tools
	},
	actions(_editor, actions) {
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

/** Admin gets full default toolset (minus multi-page). */
export const adminOverrides: TLUiOverrides = {
	tools(_editor, tools) {
		return tools
	},
	actions(_editor, actions) {
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

export const adminComponents: TLComponents = {
	OnTheCanvas: null,
	HelperButtons: ToastBridge,
	PageMenu: null,
	Minimap: null,
	SharePanel: null,
}
