(() => {
	const _browser = globalThis.chrome || globalThis.browser
	// NOTE you need to keep the dev tools inspector page open for this to work consistently
	//      MV3 uses service_workers for background pages, which get unloaded after a while
	const ws = new WebSocket('ws://localhost:9999')
	ws.onmessage = (e) => {
		if (e.data === 'reload') {
			console.log('Reloading...')
			_browser.runtime.reload()
		}
	}
})()
