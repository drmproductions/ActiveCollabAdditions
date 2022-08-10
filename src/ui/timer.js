import * as TimerDialog from './dialogs/timer.js'
import * as bus from '../bus.js'
import * as db from '../db.js'
import { El } from './el.js'

export function formatDuration(duration, separator = ':') {
	const d = new Date(duration)
	const parts = [
		d.getUTCHours().toString().padStart(2, '0'),
		d.getUTCMinutes().toString().padStart(2, '0'),
	]
	if (TIMERS_WITH_SECONDS)
		parts.push(d.getUTCSeconds().toString().padStart(2, '0'))
	return parts.join(separator)
}

export function getTimerDuration(timer) {
	if (!timer) return 0
	return timer.duration + (timer.running ? (Date.now() - timer.started_at) : 0)
}

// returns time in milliseconds
export function parseTime(time) {
	const parts = time.split(':')
	let pow = 2 // hours
	let duration = 0
	for (let part of parts) {
		part = parseInt(part)
		if (isNaN(part)) throw new Error('Invalid time format.')
		duration += part * Math.max(1, 60 ** pow)
		pow--
	}
	return duration * 1000
}
import { TIMERS_WITH_SECONDS } from '../env.js'

export function TimerMenuButton(options) {
	const { timerContext } = options

	const style = {
		cursor: 'pointer',
		float: 'left',
		height: 24,
		opacity: options.alwaysVisible ? 1 : 0,
		transition: 'ease .3s opacity',
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
		const timer = await db.getTimer(timerContext.projectId, timerContext.taskId)
		if (timer && timer.running) {
			timer.duration += Date.now() - timer.started_at
			timer.started_at = Date.now()
			timer.running = false
			await db.updateTimer(timer)
		}
		TimerDialog.show({
			projectId: timerContext.projectId,
			taskId: timerContext.taskId,
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

export function Timer({ menuButton, menuButtonOptions, timerContext }) {
	async function onClick(e) {
		const timer = await db.getTimer(timerContext.projectId, timerContext.taskId)

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
				projectId: timerContext.projectId,
				running: true,
				started_at: Date.now(),
				taskId: timerContext.taskId,
			})
		}

		// pause other timers
		for (const timer of await db.getTimers()) {
			if (timer.projectId === timerContext.projectId && timer.taskId === timerContext.taskId) continue
			if (!timer.running) continue
			timer.duration += Date.now() - timer.started_at
			timer.started_at = Date.now()
			timer.running = false
			await db.updateTimer(timer)
			break
		}
	}

	let timer
	let unsub

	function draw(el) {
		if (!timerContext.projectId || !timerContext.taskId) {
			el.parentNode.parentNode.style.display = 'none'
			return
		}
		el.parentNode.parentNode.style.display = ''

		if (!timer) {
			el.innerText = formatDuration(0)
			el.classList.toggle('running', false)
			el.classList.toggle('paused', false)
			return
		}

		const duration = getTimerDuration(timer)
		el.innerText = formatDuration(duration)
		el.classList.toggle('running', timer.running)
		el.classList.toggle('paused', !timer.running)
	}

	async function update(el) {
		if (!timerContext.projectId || !timerContext.taskId) {
			timer = undefined
			draw(el)
			return
		}
		timer = await db.getTimer(timerContext.projectId, timerContext.taskId)
		draw(el)
	}

	async function onConnected(el) {
		el = el.querySelector('.acit-timer-inner')
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'tick':
					if (!timer || !timer.running) break
					const duration = getTimerDuration(timer)
					const separator = el.innerText.includes(':') ? ' ' : ':'
					el.innerText = formatDuration(duration, separator)
					break
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
					if (data.projectId !== timerContext.projectId) break
					if (data.taskId !== timerContext.taskId) break
					update(el)
					break
				case 'timers-deleted':
					update(el)
					break
			}
		})
		timerContext.onChanged = () => update(el)
		update(el)
	}

	function onDisconnected() {
		unsub()
	}

	const style = {
		clear: 'right',
		cursor: 'default',
		float: 'left',
		marginRight: '7px',
		position: 'relative',
	}

	const innerStyle = {
		alignItems: 'center',
		backgroundColor: 'var(--color-primary)',
		borderRadius: 12,
		boxSizing: 'border-box',
		clear: 'none',
		color: 'var(--page-paper-main)',
		cursor: 'pointer',
		display: 'flex',
		fontSize: 12,
		height: 22.5,
		justifyContent: 'center',
		position: 'relative',
		textAlign: 'center',
		transition: 'transform .1s ease',
		userSelect: 'none',
		width: TIMERS_WITH_SECONDS ? 68 : 48,
		'.paused': {
			backgroundColor: '#fab300',
			// backgroundColor: '#ffc637', // V1 color
			color: 'white',
		},
		'.running': {
			backgroundColor: '#c71515',
			// backgroundColor: '#ff3c3c', // V1 color
			color: 'white',
		},
	}

	return El('div.acit-timer', { onConnected, onDisconnected, style }, [
		menuButton !== false && TimerMenuButton({ timerContext, style: { marginRight: 8 }, ...menuButtonOptions }),
		El('div.acit-timer-inner', { style: innerStyle, onClick }, formatDuration(0))
	])
}
