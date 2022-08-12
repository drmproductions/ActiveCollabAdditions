import * as TimerDialog from './dialogs/timer.js'
import * as bus from '../bus.js'
import * as cache from '../cache.js'
import * as db from '../db.js'
import * as shared from '../shared.js'
import { El } from './el.js'
import { TIMERS_WITH_SECONDS } from '../env.js'

export function TimerMenuButton(options) {
	const { updatableContext } = options

	const style = {
		cursor: 'pointer',
		float: 'left',
		height: 24,
		opacity: options.alwaysVisible ? 1 : 0,
		// transition: 'ease .3s opacity',
		width: 24,
		':hover': {
			backgroundColor: 'var(--color-theme-300)',
			borderRadius: 'var(--ac-br-4)',
			color: 'var(--color-theme-900)',
			opacity: 1,
		},
		...options.style,
	}

	async function onClick(e) {
		const timer = await db.getTimer(updatableContext.projectId, updatableContext.taskId)
		if (timer && timer.running) {
			timer.duration += Date.now() - timer.started_at
			timer.started_at = Date.now()
			timer.running = false
			await db.updateTimer(timer)
		}
		TimerDialog.show({
			projectId: updatableContext.projectId,
			taskId: updatableContext.taskId,
			dialogOptions: {
				target: e.target,
				...options.dialogOptions,
			},
		})
	}

	return El('div.acit-timer-menu-button', { style, title: 'View', onClick }, [
		El('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'var(--color-theme-600)' }, [
			El('path', { d: 'M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z', ['fill-rule']: 'nonzero' }),
		]),
	])
}

export function Timer({ inert, menuButton, menuButtonOptions, style, updatableContext = {} }) {
	async function onClick() {
		if (inert) return
		if (updatableContext.disabled) return

		const timer = await db.getTimer(updatableContext.projectId, updatableContext.taskId)

		if (timer) {
			if (timer.running) {
				timer.duration += Date.now() - timer.started_at
			}
			timer.started_at = Date.now()
			timer.running = !timer.running
			await db.updateTimer(timer)
		}
		else {
			await db.createTimer({
				duration: 0,
				projectId: updatableContext.projectId,
				running: true,
				started_at: Date.now(),
				taskId: updatableContext.taskId,
			})
			cache.preloadTasks({ projectId: updatableContext.projectId })
		}

		// pause other timers
		for (const timer of await db.getTimers()) {
			if (timer.projectId === updatableContext.projectId && timer.taskId === updatableContext.taskId) continue
			if (!timer.running) continue
			timer.duration += Date.now() - timer.started_at
			timer.started_at = Date.now()
			timer.running = false
			await db.updateTimer(timer)
			break
		}
	}

	let innerEl
	let timer
	let unsub

	function draw() {
		if (!updatableContext.projectId || !updatableContext.taskId) {
			innerEl.parentNode.parentNode.style.display = 'none'
			return
		}
		innerEl.parentNode.parentNode.style.display = ''

		if (!timer) {
			innerEl.innerText = shared.formatDuration(0)
			innerEl.classList.toggle('running', false)
			innerEl.classList.toggle('paused', false)
			return
		}

		const duration = shared.getTimerDuration(timer)
		innerEl.innerText = shared.formatDuration(duration)
		innerEl.classList.toggle('running', timer.running)
		innerEl.classList.toggle('paused', !timer.running && shared.isTimerSubmittable(timer))
	}

	async function update() {
		if (!updatableContext.projectId || !updatableContext.taskId) {
			timer = undefined
			draw()
			return
		}
		timer = await db.getTimer(updatableContext.projectId, updatableContext.taskId)
		draw()
	}

	async function onConnected() {
		if (inert) return
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'tick':
					if (!timer || !timer.running) break
					const duration = shared.getTimerDuration(timer)
					const separator = innerEl.innerText.includes(':') ? ' ' : ':'
					innerEl.innerText = shared.formatDuration(duration, separator)
					break
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
					if (data.projectId !== updatableContext.projectId) break
					if (data.taskId !== updatableContext.taskId) break
					update()
					break
				case 'timers-deleted':
					update()
					break
			}
		})
		updatableContext.onUpdate = (updates) => {
			Object.assign(updatableContext, updates)
			update()
		}
	}

	function onDisconnected() {
		if (inert) return
		unsub()
	}

	innerEl = El('div.acit-timer-inner', {
		style: {
			alignItems: 'center',
			borderRadius: 12,
			boxSizing: 'border-box',
			clear: 'none',
			cursor: !inert && !updatableContext.disabled ? 'pointer' : '',
			display: 'flex',
			fontSize: 12,
			height: 22.5,
			justifyContent: 'center',
			position: 'relative',
			textAlign: 'center',
			userSelect: 'none',
			width: TIMERS_WITH_SECONDS ? 68 : 48,
		},
		onClick,
	}, shared.formatDuration(0))

	const el = El('div.acit-timer', {
		style: {
			clear: 'right',
			cursor: 'default',
			float: 'left',
			position: 'relative',
			...style,
		},
		onConnected,
		onDisconnected,
	}, [
		menuButton !== false && TimerMenuButton({
			style: { marginRight: 8, ...menuButtonOptions?.style },
			updatableContext,
			...menuButtonOptions,
		}),
		innerEl,
	])

	if (inert) {
		if (typeof inert === 'object') {
			if (inert.className) {
				innerEl.classList.add(inert.className)
			}
			if (inert.title) {
				innerEl.title = inert.title
			}
		}
	}
	else {
		update()
	}

	return el
}
