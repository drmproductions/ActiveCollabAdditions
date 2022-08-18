(() => {
	const mutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== 'childList') continue
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLScriptElement) {
					if (node.innerText.toLowerCase().includes('angie')) {
						mutationObserver.disconnect()
						const script = document.createElement('script')
						script.setAttribute('type', 'module')
						script.src = chrome.runtime.getURL('bundle.js')
						document.head.appendChild(script)
						return
					}
				}
				else if (node instanceof HTMLBodyElement) {
					mutationObserver.disconnect()
					return
				}
			}
		}
	})
	mutationObserver.observe(document.documentElement, { childList: true, subtree: true })
})()
