import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
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

utils.call(async () => {
	// sometimes these aren't loaded when we're injected
	await onUnload(async () => {
		async function wait(key) {
			while (!angie[key]) {
				log.w(`waiting for angie.${key}`)
				await utils.sleep(100)
			}
		}
		await wait('api_url')
		await wait('collections')
		await wait('icons')
		await wait('user_session_data')
	})

	await onUnload(() => db.init())

	onUnload(() => bus.init())
	onUnload(() => cache.init())
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
