(() => {
	const _browser = globalThis.chrome || globalThis.browser

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
             js: ['bundle.js'],
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
