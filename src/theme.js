import * as bus from './bus.js'
import * as preferences from './preferences.js'
import { useStyle } from './ui/style.js'

const colors = {
	default: {
		default: {
			initial: { background: 'var(--color-primary)', text: 'var(--page-paper-main)' },
			paused: { background: '#fab300', text: 'black' },
			running: { background: '#c71515', text: 'white' },
		},
		mixed: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: 'var(--color-primary)' },
			},
			paused: { background: '#fab300', text: 'black' },
			running: { background: '#c71515', text: 'white' },
		},
		outline: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: 'var(--color-primary)' },
			},
			paused: { background: '#ffc637', text: 'var(--color-theme-900)' },
			running: { background: '#ff3c3c', text: 'var(--color-theme-900)' },
		},
	},
	classic: {
		default: {
			initial: { background: '#44a6ff', text: 'white' },
			paused: { background: '#ffc637', text: 'white' },
			running: { background: '#ff3c3c', text: 'white' },
		},
		mixed: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: '#44a6ff' },
			},
			paused: { background: '#ffc637', text: 'white' },
			running: { background: '#ff3c3c', text: 'white' },
		},
		outline: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: '#44a6ff' },
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
		mixed: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: '#ff3c3c' },
			},
			paused: { background: '#ffc637', text: 'black' },
			running: { background: '#48f311', text: 'black' },
		},
		outline: {
			initial: {
				background: 'var(--border-primary)',
				text: 'var(--color-theme-900)',
				hover: { background: '#ff3c3c' },
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
		case 'mixed':
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
					backgroundColor: paused.background,
					borderWidth: 0,
					color: paused.text,
					transition: 'none',
					':hover': {
						backgroundColor: paused.hover?.background ?? paused.background,
					},
				},
				'.running': {
					backgroundColor: running.background,
					borderWidth: 0,
					color: running.text,
					transition: 'none',
					':hover': {
						backgroundColor: running.hover?.background ?? running.background,
					},
				},
			}
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
					backgroundColor: paused.background,
					color: paused.text,
					':hover': {
						backgroundColor: paused.hover?.background ?? paused.background,
					},
				},
				'.running': {
					backgroundColor: running.background,
					color: running.text,
					':hover': {
						backgroundColor: running.hover?.background ?? running.background,
					},
				},
			}
	}
}

export function init() {
	update()
	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'preference-changed':
				const { key } = data
				if (key !== 'timersColorScheme' && key !== 'timersStyle') return
				update()
				break
		}
	})
}

async function update() {
	const className = useStyle({
		' .aca-timer-inner': await getStyles(),
	})
	document.body.classList.add(className)
	if (prevClassName) {
		document.body.classList.remove(prevClassName)
	}
	prevClassName = className
}
