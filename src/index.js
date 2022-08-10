import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as preferences from './preferences.js'
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
	const colors = {
		default: {
			default: {
				initial: { background: 'var(--color-primary)', text: 'var(--page-paper-main)' },
				paused: { background: '#fab300', text: 'black' },
				running: { background: '#c71515', text: 'white' },
			},
			outline: {
				initial: {
					background: 'var(--border-primary)',
					text: 'var(--color-theme-900)',
					hover: {
						background: 'var(--color-primary)',
					},
				},
				paused: { background: '#ffc637', text: 'var(--color-theme-900)' },
				running: { background: '#ff3c3c', text: 'var(--color-theme-900)' },
			},
		},
		'stop-light': {
			default: {
				initial: { background: '#ff3c3c', text: 'white' },
				paused: { background: '#ffc637', text: 'black' },
				running: { background: '#48f311', text: 'black' },
			},
			outline: {
				initial: {
					background: 'var(--border-primary)',
					text: 'var(--color-theme-900)',
					hover: {
						background: '#ff3c3c',
					},
				},
				paused: { background: '#ffc637', text: 'var(--color-theme-900)' },
				running: { background: '#48f311', text: 'var(--color-theme-900)' },
			},
		},
	}

	let prevClassName

	async function getStyles() {
		const style = await preferences.getTimersStyle()
		const colorScheme = await preferences.getTimersColorScheme()
		const { initial, paused, running } = colors[colorScheme][style]

		switch (style) {
			case 'outline':
				return {
					borderColor: initial.background,
					borderStyle: 'solid',
					borderWidth: 1,
					color: initial.text,
					transition: 'border-color ease .3s',
					':hover': {
						borderColor: initial.hover?.background ?? initial.background,
					},
					'.paused': {
						borderColor: paused.background,
						color: paused.text,
						transition: 'none',
						':hover': {
							borderColor: paused.hover?.background ?? paused.background,
						},
					},
					'.running': {
						borderColor: running.background,
						color: running.text,
						transition: 'none',
						':hover': {
							borderColor: running.hover?.background ?? running.background,
						},
					},
				}
			default:
				return {
					backgroundColor: initial.background,
					color: initial.text,
					':hover': {
						backgroundColor: initial.hover?.background ?? initial.background,
					},
					'.paused': {
						':hover': {
							backgroundColor: paused.hover?.background ?? paused.background,
						},
						backgroundColor: paused.background,
						color: paused.text,
					},
					'.running': {
						':hover': {
							backgroundColor: running.hover?.background ?? running.background,
						},
						backgroundColor: running.background,
						color: running.text,
					},
				}
		}
	}

	async function update() {
		const className = useStyle({
			' .acit-timer-inner': await getStyles(),
		})
		document.body.classList.add(className)
		if (prevClassName) {
			document.body.classList.remove(prevClassName)
		}
		prevClassName = className
	}

	update()

	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'preference-changed':
				const { key } = data
				if (key !== 'timersColorScheme' && key !== 'timersStyle') return
				update(key)
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

console.log('ActiveCollabAdditions loaded!')
