import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as eljector from './eljector.js'
import * as log from './log.js'
import * as shared from './shared.js'
import * as theme from './theme.js'
import { El, getEl } from './ui/el.js'
import { Timer } from './ui/timer.js'

const unloadFuncs = []

async function onUnload(func) {
	func = await func()
	if (!func) return
	if (typeof func !== 'function')
		throw new Error('expected onUnload to return a function')
	unloadFuncs.push(func)
}

function unload() {
	for (const func of unloadFuncs)
		func()
	unloadFuncs.length = 0
}

// main

await onUnload(async () => {
	await db.open()
	return () => db.close()
})

onUnload(() => {
	cache.preload()
})

onUnload(() => {
	bus.init()
	return () => bus.deinit()
})

onUnload(() => {
	const interval = setInterval(() => {
		bus.emit('tick', { local: true })
	}, 1000)
	return () => clearInterval(interval)
})

onUnload(() => {
	eljector.init()
	return () => eljector.deinit()
})

onUnload(() => () => {
	PreferencesDialog.hide()
	TimersDialog.hide()
})

onUnload(async () => {
	theme.update()

	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'preference-changed':
				const { key } = data
				if (key !== 'timersColorScheme' && key !== 'timersStyle') return
				theme.update()
				break
		}
	})
})

onUnload(async () => {
	const containerEl = document.querySelector('.topbar_items')
	if (!containerEl) return

	function onClick() {
		TimersDialog.show()
	}

	// TODO only do this in development mode
	function onContextMenu(e) {
		e.preventDefault()
		// TODO not supported with new ESM structure
		// bus.emit('hot-reload')
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex !important',
		justifyContent: 'center',
	}

	const updatableContext = {}
	const timerEl = Timer({
		menuButtonOptions: { alwaysVisible: true, style: { marginRight: 16 } },
		style: {
			marginLeft: 8,
			pointerEvents: 'all',
			top: 9,
		},
		updatableContext,
	})

	async function update() {
		let timers = await db.getTimers()
		timers = timers.filter((timer) => shared.getTimerDuration(timer) > 0)
		timers.sort((a, b) => b.started_at - a.started_at)

		const timer = timers.find(timer => timer.running) || timers[0]

		const projectId = timer?.projectId
		const taskId = timer?.taskId

		if (updatableContext.projectId !== projectId || updatableContext.taskId !== taskId) {
			updatableContext?.onUpdate({ projectId, taskId })

			if (timer) {
				const projectName = await cache.getProjectName({ projectId })
				const taskName = await cache.getTaskName({ projectId: timer.projectId, taskId: timer.taskId })
				getEl(timerEl).title = `${projectName} - ${taskName}`
			}
		}
	}

	const unsub = bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'timer-created':
			case 'timer-deleted':
			case 'timer-updated':
			case 'timers-deleted':
				update()
				break
		}
	})

	update()

	const el = El('li.topbar_item', { onClick, onContextMenu }, [
		El('button.btn', [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_time_tracker_icon,
				style: iconStyle,
			}),
		]),
	])

	const timerWrapperEl = El('li.topbar_item', {
		style: {
			margin: 0,
			width: 'fit-content !important',
		},
	}, [timerEl])

	containerEl.prepend(el)
	containerEl.prepend(timerWrapperEl)

	return () => {
		unsub()
		el.remove()
		timerWrapperEl.remove()
	}
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
