import { TLAssetStore, uniqueId } from 'tldraw'
import { MAX_UPLOAD_BYTES } from './constants'

// How does our server handle assets like images and videos?
export const multiplayerAssetStore: TLAssetStore = {
	// to upload an asset, we...
	async upload(_asset, file) {
		if (file.size > MAX_UPLOAD_BYTES) {
			throw new Error(`File too large. Max upload size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`)
		}

		// ...create a unique name & URL...
		const id = uniqueId()
		const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-')
		const url = `/api/uploads/${objectName}`

		// ...POST it to out worker to upload it...
		const response = await fetch(url, {
			method: 'POST',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		// ...and return the URL to be stored with the asset record.
		return { src: url }
	},

	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}
