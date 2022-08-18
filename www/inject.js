(() => {
	const tests = ['angie', 'angie.api_url', 'angie.initial_data']
	const scripts = Array.from(document.getElementsByTagName('script'))
	const isActiveCollabPage = scripts.some(el => tests.some(test => el.innerText.toLowerCase().includes(test)))
	if (!isActiveCollabPage) return

	const script = document.createElement('script')
	script.setAttribute('type', 'module')
	script.src = chrome.runtime.getURL('bundle.js')
	document.body.appendChild(script)
})()
