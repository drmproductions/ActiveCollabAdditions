// SEE https://bugs.chromium.org/p/chromium/issues/detail?id=634381
// we need to load the script early, otherwise our fetch proxy stuff doesn't work
(() => {
	const _browser = globalThis.chrome || globalThis.browser

	if (!_browser.runtime.getManifest().update_url) {
		const ws = new WebSocket('ws://localhost:9999')
		ws.onmessage = (e) => {
			if (e.data === 'reload') {
				_browser.runtime.reload()
			}
		}
	}

	async function updateContentScripts() {
		try {
			await _browser.scripting.unregisterContentScripts({ ids: ['bundle'] })
		}
		catch {}

		let { origins } = await chrome.permissions.getAll()
		origins = origins.filter(x => x !== '*://*/*')
		if (origins.length === 0) return

		await _browser.scripting.registerContentScripts([{
			id: 'bundle',
			js: ['bundle.min.js'],
			matches: origins,
			world: 'MAIN',
			runAt: 'document_start',
		}])
	}

	if (_browser.runtime.getManifest().manifest_version == 3) {
		_browser.permissions.onAdded.addListener(updateContentScripts)
		_browser.permissions.onRemoved.addListener(updateContentScripts)
		updateContentScripts()
	}
	else {
		// TODO figure out how we'll do this for firefox, probably an eval?
	}
})()
