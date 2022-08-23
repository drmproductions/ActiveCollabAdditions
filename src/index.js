import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as api from './api.js'
import * as bus from './bus.js'
import * as cacher from './cacher.js'
import * as db from './db.js'
import * as injector from './injector.js'
import * as log from './log.js'
import * as meta from './meta.json'
import * as style from './ui/style.js'
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

api.init()

utils.call(async () => {
	await waitForBody()
	onUnload(() => style.init())

	// we need to wait for several angie values to be populated before continuing
	await onUnload(async () => {
		function check(keys) {
			let obj = angie
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]
				if (obj[key] === undefined) {
					return false
				}
				if (i < keys.length - 1) {
					obj = obj[key]
				}
			}
			return true
		}

		async function wait(key) {
			const keys = key.split('.')
			while (!check(keys)) {
				await utils.sleep(100)
			}
		}

		await wait('api_url')
		await wait('collections')
		await wait('collections.job_types')
		await wait('collections.users')
		await wait('icons')
		await wait('icons.main_menu_icon_system_settings')
		await wait('icons.main_menu_icon_trash')
		await wait('icons.svg_icons_cancel')
		await wait('icons.svg_icons_icon_submit_time')
		await wait('icons.svg_icons_recurring')
		await wait('icons.svg_icons_star')
		await wait('icons.svg_icons_time_tracker_icon')
		await wait('user_session_data')
		await wait('user_session_data.logged_user_id')
	})

	await onUnload(() => db.init())

	onUnload(() => bus.init())
	onUnload(() => cacher.init())
	onUnload(() => injector.init())
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
