import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as eljector from './eljector.js'
import * as log from './log.js'
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

// main

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

onUnload(() => bus.onMessage(({ kind }) => {
	switch (kind) {
		case 'hot-reload':
			setTimeout(() => {
				unload()
				window.postMessage('acit-hot-reload', '*')
			}, 100)
			break
	}
}))

log.i('', 'loaded')
