let scrapbookOwnerKey: string | null = null

export function setScrapbookOwnerKey(key: string | null) {
	scrapbookOwnerKey = key
}

export function getScrapbookOwnerKey() {
	return scrapbookOwnerKey
}
