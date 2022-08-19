// SEE https://bugs.chromium.org/p/chromium/issues/detail?id=634381
// the following runs before page scripts, so we can proxy window.fetch before code gets a local reference to the built-in
// the page must include an inline script element containing the string "angie" for the proxy to be enabled
(() => {
	let interceptRequest
	let isActiveCollabPage = false

	window.fetch = new Proxy(window.fetch, {
		apply(target, self, args) {
			if (isActiveCollabPage) {
				if (window.acaInterceptRequest) {
					interceptRequest = window.acaInterceptRequest
					delete window.acaInterceptRequest
				}

				if (interceptRequest) {
					return interceptRequest(target, self, ...args)
				}
			}
			return target.call(self, ...args)
		},
	})

	const mutationObserver = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== 'childList') continue
			for (const node of mutation.addedNodes) {
				if (node instanceof HTMLScriptElement) {
					if (node.innerText.toLowerCase().includes('angie')) {
						mutationObserver.disconnect()
						isActiveCollabPage = true
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
