import * as TimerDialog from './dialogs/timer.js'
import * as bus from '../bus.js'
import * as cache from '../cache.js'
import * as db from '../db.js'
import * as shared from '../shared.js'
import { El } from './el.js'
import { TIMERS_WITH_SECONDS } from '../env.js'

export const timerInnerClassName = {
	alignItems: 'center',
	borderRadius: 12,
	boxSizing: 'content-box',
	clear: 'none',
	display: 'flex',
	fontSize: 12,
	height: 22.5,
	justifyContent: 'center',
	position: 'relative',
	textAlign: 'center',
	userSelect: 'none',
	width: TIMERS_WITH_SECONDS ? 68 : 48,
}

export function TimerMenuButton(options) {
	const style = {
		cursor: 'pointer',
		float: 'left',
		height: 24,
		opacity: options.alwaysVisible ? 1 : 0,
		width: 24,
		':hover': {
			backgroundColor: 'var(--color-theme-300)',
			borderRadius: 'var(--ac-br-4)',
			color: 'var(--color-theme-900)',
			opacity: 1,
		},
		...options.style,
	}

	async function onClick() {
		const { projectId, taskId } = Timer.getProjectAndTaskId(options.timerEl ?? this.parentNode)

		TimerDialog.show({
			projectId,
			taskId,
			dialogOptions: {
				target: this,
				...options.dialogOptions,
			},
		})
	}

	return El('div.aca-timer-menu-button', { style, title: 'View', onClick }, [
		El('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'var(--color-theme-600)' }, [
			El('path', { d: 'M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z', ['fill-rule']: 'nonzero' }),
		]),
	])
}

Timer.cachedTimers = new WeakMap()

Timer.getDisabled = (el) => {
	return El.getData(el, 'disabled') === 'true'
}

Timer.getInnerEl = (el) => {
	return el.querySelector('.aca-timer-inner')
}

Timer.getMenuButtonEl = (el) => {
	return el.querySelector('.aca-timer-menu-button')
}

Timer.getProjectAndTaskId = (el) => {
	return {
		projectId: parseInt(El.getData(el, 'projectId')),
		taskId: parseInt(El.getData(el, 'taskId')),
	}
}

Timer.draw = (el) => {
	const { projectId, taskId } = Timer.getProjectAndTaskId(el)

	if (isNaN(projectId) || isNaN(taskId)) {
		el.style.display = 'none'
		return
	}

	el.style.display = ''

	const innerEl = Timer.getInnerEl(el)
	const timer = Timer.cachedTimers.get(el)

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

Timer.setDisabled = (el, disabled) => {
	El.setData(el, { disabled })
}

Timer.setProjectAndTaskId = (el, projectId, taskId) => {
	El.setData(el, { projectId, taskId })
}

Timer.update = async (el) => {
	const { projectId, taskId } = Timer.getProjectAndTaskId(el)

	if (isNaN(projectId) || isNaN(taskId)) {
		Timer.cachedTimers.delete(el)
		Timer.draw(el)
		return
	}

	const timer = await db.getTimer(projectId, taskId)
	Timer.cachedTimers.set(el, timer)
	Timer.draw(el)
}

export function Timer({ dataset, inert, menuButton, menuButtonOptions, style }) {
	let unsub

	async function onClick() {
		if (inert) return
		if (Timer.getDisabled(this.parentNode)) return

		const { projectId, taskId } = Timer.getProjectAndTaskId(this.parentNode)

		const timer = await db.getTimer(projectId, taskId)

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
				projectId,
				running: true,
				started_at: Date.now(),
				taskId,
			})
		}

		// pause other timers
		for (const timer of await db.getTimers()) {
			if (timer.projectId === projectId && timer.taskId === taskId) continue
			if (!timer.running) continue
			timer.duration += Date.now() - timer.started_at
			timer.started_at = Date.now()
			timer.running = false
			await db.updateTimer(timer)
			break
		}
	}

	async function onConnected() {
		const { projectId } = Timer.getProjectAndTaskId(this)
		if (!isNaN(projectId)) {
			const project = await cache.getProject({ projectId })
			if (!project.is_tracking_enabled) {
				this.remove()
				return
			}
			this.style.display = ''
		}

		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'tick':
					const timer = Timer.cachedTimers.get(this)
					if (!timer || !timer.running) break
					const innerEl = Timer.getInnerEl(this)
					const duration = shared.getTimerDuration(timer)
					const separator = innerEl.innerText.includes(':') ? ' ' : ':'
					innerEl.innerText = shared.formatDuration(duration, separator)
					break
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
					const { projectId, taskId } = Timer.getProjectAndTaskId(this)
					if (data.projectId !== projectId) break
					if (data.taskId !== taskId) break
					Timer.update(this)
					break
				case 'timers-deleted':
					Timer.update(this)
					break
			}
		})
	}

	function onDisconnected() {
		unsub?.()
	}

	innerEl = El('div.aca-timer-inner', {
		style: timerInnerClassName,
		onClick,
	}, shared.formatDuration(0))

	const el = El('div.aca-timer', {
		dataset,
		style: {
			clear: 'right',
			cursor: 'default',
			float: 'left',
			position: 'relative',
			...style,
		},
		onConnected: !inert && onConnected,
		onDisconnected: !inert && onDisconnected,
	}, [
		menuButton !== false && TimerMenuButton({
			style: { marginRight: 8, ...menuButtonOptions?.style },
			...menuButtonOptions,
		}),
		innerEl,
	])

	if (!inert) {
		el.style.display = 'none'
	}

	innerEl.style.cursor = !inert ? 'pointer' : ''

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
		Timer.update(el)
	}

	return el
}
