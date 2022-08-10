import * as SettingsDialog from './settings.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as dialog from './dialog.js'
import * as shared from '../../shared.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El, getEl } from '../el.js'
import { Timer, TimerMenuButton } from '../timer.js'
import { useAnimation } from '../style.js'

const rotateAnimation = useAnimation({
	0: { transform: 'rotate(0) scaleX(-1)' },
	100: { transform: 'rotate(360deg) scaleX(-1)' },
})

function Project({ name, tasks, timer }) {
	const timersStyle = {
		border: '1px solid var(--border-primary)',
		borderRadius: '6px',
		overflow: 'hidden',
	}

	return El('div', [
		El('h2', { style: { marginTop: '16px' } }, name),
		El('div', { style: timersStyle }, tasks.map(Task))
	])
}

function Task({ name, timer, timerEl }, index, timers) {
	const { projectId, taskId } = timer

	const style = {
		backgroundColor: index % 2 === 0 ? 'var(--color-theme-300)' : 'var(--color-theme-200)',
		color: 'var(--color-theme-700)',
		display: 'flex',
		fontSize: 12,
		fontWeight: 500,
		height: 40,
		borderBottom: index < timers.length - 1 ? '1px solid var(--border-primary)' : '',
	}

	const buttonStyle = {
		alignItems: 'center',
		cursor: 'pointer',
		display: 'flex',
		padding: '0 10px',
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex !important',
		fill: 'var(--color-theme-600)',
		justifyContent: 'center',
	}

	const labelStyle = {
		alignItems: 'center',
		display: 'flex',
	}

	const timerStyle = {
		alignItems: 'center',
		display: 'flex',
		justifyContent: 'center',
		padding: '0 10px',
	}

	async function onClickCancelSubmit() {
		delete timer.submittingState
		await db.updateTimer(timer)
	}

	async function onClickDelete() {
		await db.deleteTimer(projectId, taskId)
	}

	async function onClickSubmit() {
		await shared.submitTimer({ projectId, taskId })
	}

	const children = []
	children.push(El('div', { style: timerStyle }, [timerEl]))
	children.push(El('div', { style: { ...labelStyle, marginRight: 'auto' } }, name))

	if (timer.submittingState) {
		if (timer.submittingState === 'submitting') {
			children.push(El('div', {
				style: {
					alignItems: 'center',
					animation: `${rotateAnimation} 3s linear infinite`,
					display: 'flex',
					padding: '0 10px',
					transformOrigin: 'center',
				},
				title: 'Submitting...'
			}, [
				El('span.icon', {
					innerHTML: angie.icons.svg_icons_recurring,
					style: { ...iconStyle, scale: 1 },
				}),
			]))
		}
		children.push(El('div', { style: buttonStyle, title: 'Cancel Submit', onClick: onClickCancelSubmit }, [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_cancel,
				style: { ...iconStyle, scale: 1.3 },
			}),
		]))
	}
	else {
		children.push(El('div', { style: buttonStyle }, [
			TimerMenuButton({ alwaysVisible: true, dialogOptions: { centered: true }, updatableContext: { projectId, taskId } }),
		]))
		children.push(El('div', { style: buttonStyle, title: 'Submit', onClick: onClickSubmit }, [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_icon_submit_time,
				style: { ...iconStyle, scale: 1.2 },
			}),
		]))
		children.push(El('div', { style: buttonStyle, title: 'Delete', onClick: onClickDelete }, [
			El('span.icon', {
				innerHTML: angie.icons.main_menu_icon_trash,
				style: { ...iconStyle, scale: 1.05 },
			}),
		]))
	}

	return El('div', { style }, children)
}

export function hide() {
	dialog.hide('timers')
}

export function show() {
	let unsub

	const bodyEl = DialogBody()
	const bodyMessageStyle = {
		alignItems: 'center',
		display: 'flex',
		fontSize: 16,
		height: 200,
		justifyContent: 'center',
	}

	async function onClickDelete() {
		await db.deleteTimers()
		hide()
	}

	async function onClickSubmit() {
		const items = []
		for (const timer of await db.getTimers()) {
			const { projectId, taskId } = timer
			const name = await cache.getTaskName({ projectId, taskId })
			items.push({ projectId, taskId, name })
			timer.submittingState = 'queued'
			await db.updateTimer(timer)
		}
		items.sort((a, b) => a.name.localeCompare(b.name))
		for (const { projectId, taskId } of items) {
			const timer = await db.getTimer(projectId, taskId)
			if (!timer || timer.submittingState !== 'queued') continue
			await shared.submitTimer({ projectId, taskId })
		}
	}

	function onClickShowSettings() {
		SettingsDialog.show()
	}

	async function onConnected(el) {
		unsub = bus.onMessage(({ kind, data }) => {
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
	}

	function onDisconnected() {
		unsub()
	}

	const submitAllButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_icon_submit_time,
		iconStyleExtra: { scale: 1.3 },
		title: 'Submit All',
		onClick: onClickSubmit,
	})

	const deleteAllButtonEl = DialogHeaderButton({
		icon: angie.icons.main_menu_icon_trash,
		iconStyleExtra: { scale: 1.2 },
		title: 'Delete All',
		onClick: onClickDelete,
	})

	const previousTimerElMap = new Map()

	async function update() {
		const timeout = setTimeout(() => {
			getEl(bodyEl).innerHTML = ''
			getEl(bodyEl).appendChild(El('div', { style: bodyMessageStyle }, 'LOADING...'))
		}, 500)

		const timers = await db.getTimers()
		if (timers.length === 0) {
			clearTimeout(timeout)
			getEl(bodyEl).innerHTML = ''
			getEl(bodyEl).appendChild(El('div', { style: bodyMessageStyle }, 'No timers started'))
			submitAllButtonEl.style.display = 'none'
			deleteAllButtonEl.style.display = 'none'
			return
		}

		submitAllButtonEl.style.display = ''
		deleteAllButtonEl.style.display = ''

		const projectsMap = new Map()
		for (const timer of timers) {
			let project = projectsMap.get(timer.projectId)
			if (!project) {
				const name = await cache.getProjectName({ projectId: timer.projectId })
				project = { name, tasks: [], timer }
				projectsMap.set(timer.projectId, project)
			}

			const name = await cache.getTaskName({ projectId: timer.projectId, taskId: timer.taskId })

			const disabled = Boolean(timer.submittingState)
			let timerEl
			const id = `${timer.projectId}-${timer.taskId}`
			const previousTimerEl = previousTimerElMap.get(id)
			if (previousTimerEl) {
				previousTimerEl.updatableContext?.onUpdate({ disabled })
				timerEl = previousTimerEl.timerEl
			}
			else {
				const updatableContext = { projectId: timer.projectId, taskId: timer.taskId }
				timerEl = Timer({ disabled, menuButton: false, updatableContext })
				getEl(timerEl).style.marginRight = ''
				previousTimerElMap.set(id, { timerEl, updatableContext })
			}

			project.tasks.push({ name, timer, timerEl })
		}

		const projects = Array.from(projectsMap.values())
		projects.sort((a, b) => a.name.localeCompare(b.name))

		clearTimeout(timeout)
		getEl(bodyEl).innerHTML = ''
		for (const project of projects) {
			project.tasks.sort((a, b) => a.name.localeCompare(b.name))
			getEl(bodyEl).appendChild(Project(project))
		}
	}

	const dialogEl = Dialog({ onConnected, onDisconnected }, [
		DialogHeader('Timers', [
			DialogHeaderButton({
				icon: angie.icons.main_menu_icon_system_settings,
				iconStyleExtra: { scale: 1.3 },
				title: 'Settings',
				onClick: onClickShowSettings,
			}),
			submitAllButtonEl,
			deleteAllButtonEl,
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		bodyEl,
	])
	dialog.show('timers', dialogEl)
}
