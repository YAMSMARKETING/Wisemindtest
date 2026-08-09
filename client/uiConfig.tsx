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
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import { PageFrame } from './PageFrame'
import { StickerPicker } from './StickerPicker'
import { ToastBridge } from './ToastBridge'

function StickerToolbarItem() {
	const tools = useTools()
	const isSelected = useIsToolSelected(tools['sticker'])
	return <TldrawUiMenuItem {...tools['sticker']} isSelected={isSelected} />
}

/** Contributor toolbar: select, hand, draw, eraser, text, image, sticker. */
export function CommunalToolbar() {
	return (
		<>
			<DefaultToolbar>
				<SelectToolbarItem />
				<HandToolbarItem />
				<DrawToolbarItem />
				<EraserToolbarItem />
				<TextToolbarItem />
				<AssetToolbarItem />
				<StickerToolbarItem />
			</DefaultToolbar>
			<StickerPicker />
		</>
	)
}

function OnTheCanvasLayer() {
	return <PageFrame />
}

export const communalComponents: TLComponents = {
	Toolbar: CommunalToolbar,
	OnTheCanvas: OnTheCanvasLayer,
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
	tools(editor, tools) {
		tools.sticker = {
			id: 'sticker',
			label: 'Stickers',
			icon: 'heart',
			kbd: 's',
			onSelect: () => {
				editor.setCurrentTool('sticker')
			},
		}

		const allowed = new Set([
			'select',
			'hand',
			'draw',
			'eraser',
			'text',
			'asset',
			'sticker',
		])
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
	OnTheCanvas: OnTheCanvasLayer,
	HelperButtons: ToastBridge,
	PageMenu: null,
	Minimap: null,
	SharePanel: null,
}
