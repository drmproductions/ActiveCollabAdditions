import * as bus from '../bus.js'
import * as db from '../db.js'
import { El } from './el.js'

const TIMERS_WITH_SECONDS = false

function formatDuration(duration, separator = ':') {
	const d = new Date(duration)
	const parts = [
		d.getUTCHours().toString().padStart(2, '0'),
		d.getUTCMinutes().toString().padStart(2, '0'),
	]
	if (TIMERS_WITH_SECONDS)
		parts.push(d.getUTCSeconds().toString().padStart(2, '0'))
	return parts.join(separator)
}

export function Timer(self) {
	async function onClick(e) {
		const timer = await db.getTimer(self.project, self.task)

		if (timer) {
			if (timer.running) {
				timer.duration += Date.now() - timer.start
			}
			else {
				timer.start = Date.now()
			}

			timer.running = !timer.running
			await db.updateTimer(timer)
		}
		else {
			await db.createTimer({
				duration: 0,
				project: self.project,
				running: true,
				start: Date.now(),
				task: self.task,
			})
		}

		// pause other timers
		for (const timer of await db.getTimers()) {
			if (timer.project === self.project && timer.task === self.task) continue
			if (!timer.running) continue
			timer.duration += Date.now() - timer.start
			timer.running = false
			await db.updateTimer(timer)
			break
		}
	}

	let timer
	let unsub

	function draw(el) {
		if (!self.project || !self.task) {
			el.parentNode.parentNode.style.display = 'none'
			return
		}
		el.parentNode.parentNode.style.display = ''

		if (!timer) {
			el.innerText = formatDuration(0)
			el.style.backgroundColor = 'var(--color-primary)'
			return
		}

		const duration = timer.duration + (timer.running ? (Date.now() - timer.start) : 0)
		const separator = el.innerText.includes(':') ? ' ' : ':'
		el.innerText = formatDuration(duration, separator)
		el.style.backgroundColor = timer.running ? '#C71515' : '#ED812A'
	}

	async function update(el) {
		if (!self.project || !self.task) {
			timer = undefined
			draw(el)
			return
		}
		timer = await db.getTimer(self.project, self.task)
		draw(el)
	}

	async function onConnected(el) {
		el = el.querySelector('.acit-timer-inner')
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'tick':
					if (!timer || !timer.running) break
					draw(el)
					break
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
					if (data.project !== self.project) break
					if (data.task !== self.task) break
					update(el)
					break
				case 'timers-deleted':
					update(el)
					break
			}
		})
		self.onChanged = () => update(el)
		update(el)
	}

	async function onContextMenu(e) {
		e.preventDefault()
		await db.deleteTimer(self.project, self.task)
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
		borderRadius: '12px',
		boxSizing: 'border-box',
		clear: 'none',
		color: 'white',
		cursor: 'pointer',
		display: 'flex',
		height: '22.5px',
		justifyContent: 'center',
		position: 'relative',
		textAlign: 'center',
		textShadow: '0 0 30px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(0, 0, 0, 0.25)',
		transition: 'transform .1s ease',
		width: TIMERS_WITH_SECONDS ? '68px' : '48px',
	}

	return El('div.acit-timer', { onClick, onConnected, onContextMenu, onDisconnected, style }, [
		El('div.acit-timer-inner', { style: innerStyle }, formatDuration(0))
	])
}
