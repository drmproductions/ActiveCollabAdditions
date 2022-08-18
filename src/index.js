import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cacher from './cacher.js'
import * as db from './db.js'
import * as eljector from './eljector.js'
import * as log from './log.js'
import * as meta from './meta.json'
import * as theme from './theme.js'
import * as utils from './utils.js'

const unloadFuncs = []

async function onUnload(func) {
	func = await func()
	if (!func) return
	if (typeof func !== 'function')
		throw new Error('expected onUnload to return a function')
	unloadFuncs.push(func)
}

function unload() {
	let func
	while (func = unloadFuncs.pop()) {
		func()
	}
}

function waitForBody() {
	if (document.body) return
	return new Promise(resolve => {
		const mo = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type !== 'childList') continue
				for (const node of mutation.addedNodes) {
					if (node instanceof HTMLBodyElement) {
						mo.disconnect()
						resolve()
						return
					}
				}
			}
		})
		mo.observe(document.documentElement, { childList: true })
	})
}

onUnload(() => cacher.earlyInit())

utils.call(async () => {
	await waitForBody()

	// sometimes these aren't loaded when we're injected
	await onUnload(async () => {
		async function wait(key) {
			while (!angie[key]) {
				log.w(`waiting for angie.${key}`)
				await utils.sleep(100)
			}
			log.w(`waited for angie.${key}`)
		}
		await wait('api_url')
		await wait('collections')
		await wait('icons')
		await wait('user_session_data')
		// TODO we may only need to wait for this?
		await wait('all_loaded')
	})

	await onUnload(() => db.init())

	onUnload(() => bus.init())
	onUnload(() => cacher.init())
	onUnload(() => eljector.init())
	onUnload(() => theme.init())

	onUnload(() => utils.setInterval(() => {
		bus.emit('tick', { local: true })
	}, 1000))

	onUnload(() => () => {
		PreferencesDialog.hide()
		TimersDialog.hide()
	})

	log.i('', `Version ${meta.version} loaded`)
})
