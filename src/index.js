import * as SettingsDialog from './ui/dialogs/settings.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import { El } from './ui/el.js'
import { Timer } from './ui/timer.js'

const unloadFuncs = []

function createMissingTimerElements() {
	function variant1() {
		for (const taskEl of document.body.querySelectorAll('div.task_view_mode')) {
			const taskNameEl = taskEl.querySelector('.task_name')
			if (!taskNameEl) continue

			const { href } = taskNameEl
			if (!href) continue

			const matches = new URL(href).pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)/)
			if (!matches) continue

			const project = parseInt(matches[2])
			const task = parseInt(matches[5])

			if (isNaN(project) || isNaN(task)) continue

			cache.set(`task-name-${project}-${task}`, taskNameEl.innerText)

			if (!taskEl.querySelector('.acit-timer')) {
				taskEl.prepend(Timer({ project, task }))
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
	SettingsDialog.hide()
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
		bus.emit('hot-reload')
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex',
		justifyContent: 'center',
	}

	const timerElData = {}
	const timerEl = Timer(timerElData)
	timerEl.firstChild.style.marginRight = ''
	timerEl.firstChild.style.marginLeft = '16px'
	timerEl.firstChild.style.top = '8px'
	timerEl.firstChild.style.pointerEvents = 'all'

	async function update() {
		const timers = await db.getTimers()
		const timer = timers.filter(timer => timer.running)[0]
		const project = timer?.project
		const task = timer?.task
		if (timerElData.project !== project || timerElData.task !== task) {
			timerElData.project = project
			timerElData.task = task
			timerElData?.onChanged()
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
			width: 'fit-content',
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
