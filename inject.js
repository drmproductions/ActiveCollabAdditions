(() => {
	const tests = ['activecollab', 'activecollab_csrf', 'angie.api_url']
	const scripts = Array.from(document.getElementsByTagName('script'))
	const isActiveCollabPage = scripts.some(el => tests.some(test => el.innerText.toLowerCase().includes(test)))
	if (!isActiveCollabPage) return

	let script
	function injectScript() {
		if (script) {
			script.remove()
			script = undefined
		}
		script = document.createElement('script')
		script.setAttribute('type', 'module')
		script.src = chrome.runtime.getURL('src/index.js')
		document.body.appendChild(script)
	}

	window.addEventListener('message', (event) => {
		if (event.data !== 'acit-hot-reload') return
		injectScript()
	}, false)

	injectScript()
})()
