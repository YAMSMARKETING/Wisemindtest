import { Editor } from 'tldraw'
import { jsPDF } from 'jspdf'

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = filename
	anchor.click()
	URL.revokeObjectURL(url)
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result))
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
		reader.readAsDataURL(blob)
	})
}

/** Export every shape on the current page (full board), not just the selection/viewport. */
async function exportFullBoardPng(editor: Editor) {
	const shapeIds = [...editor.getCurrentPageShapeIds()]
	if (shapeIds.length === 0) {
		throw new Error('Nothing to export')
	}

	return editor.toImage(shapeIds, {
		format: 'png',
		background: true,
		padding: 32,
		pixelRatio: 2,
	})
}

export async function exportBoardAsPng(editor: Editor) {
	const { blob } = await exportFullBoardPng(editor)
	downloadBlob(blob, 'whiteboard.png')
}

export async function exportBoardAsPdf(editor: Editor) {
	const { blob, width, height } = await exportFullBoardPng(editor)
	const dataUrl = await blobToDataUrl(blob)

	const pdf = new jsPDF({
		orientation: width >= height ? 'landscape' : 'portrait',
		unit: 'px',
		format: [width, height],
		hotfixes: ['px_scaling'],
	})

	pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
	pdf.save('whiteboard.pdf')
}

export function clearBoard(editor: Editor) {
	const shapeIds = [...editor.getCurrentPageShapeIds()]
	if (shapeIds.length === 0) return
	editor.deleteShapes(shapeIds)
}
