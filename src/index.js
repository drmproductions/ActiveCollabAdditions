import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import { El, getEl } from './ui/el.js'
import { Timer } from './ui/timer.js'
import { useStyle } from './ui/style.js'

const unloadFuncs = []

const showTimerWhenHoveringOverTaskClassName = useStyle({
	':hover': {
		' .acit-timer-menu-button': {
			opacity: 1,
		},
	},
})

function createMissingTimerElements() {
	function variant1() {
		for (const taskEl of document.body.querySelectorAll('div.task_view_mode')) {
			const taskNameEl = taskEl.querySelector('.task_name')
			if (!taskNameEl) continue

			const { href } = taskNameEl
			if (!href) continue

			const matches = new URL(href).pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)/)
			if (!matches) continue

			const projectId = parseInt(matches[2])
			const taskId = parseInt(matches[5])

			if (isNaN(projectId) || isNaN(taskId)) continue

			cache.setTaskName({ projectId, taskId, name: taskNameEl.innerText })

			// sometimes this disappears, so it's probably best if we always add it
			taskEl.classList.add(showTimerWhenHoveringOverTaskClassName)

			if (!taskEl.querySelector('.acit-timer')) {
				taskEl.prepend(Timer({ updatableContext: { projectId, taskId } }))
			}
		}
	}

	variant1()
}

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
	const mo = new MutationObserver((mutations) => {
		mutations.some((mutation) => {
			if (!mutation.target.querySelector('.task_view_mode')) return
			createMissingTimerElements()
			return true
		})
	})
	mo.observe(document.body, { childList: true, subtree: true })
	return () => mo.disconnect()
})

onUnload(() => () => {
	PreferencesDialog.hide()
	TimersDialog.hide()
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
	const timerEl = Timer({ menuButtonOptions: { alwaysVisible: true, style: { marginRight: 16 } }, updatableContext })
	{
		const el = getEl(timerEl)
		el.style.marginRight = ''
		el.style.marginLeft = '8px'
		el.style.top = '9px'
		el.style.pointerEvents = 'all'
	}

	async function update() {
		const timers = await db.getTimers()
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

onUnload(() => {
	createMissingTimerElements()

	return () => {
		const els = document.body.querySelectorAll('.acit-timer')
		for (const el of els)
			el.parentNode.remove()
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

console.log('Active Collab Additions loaded!')
