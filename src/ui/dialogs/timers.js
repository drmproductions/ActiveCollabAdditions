import * as ConfirmPopup from '../popups/confirm.js'
import * as PreferencesDialog from './preferences.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as overlay from '../overlay.js'
import * as shared from '../../shared.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El, getEl } from '../el.js'
import { Timer, TimerMenuButton } from '../timer.js'
import { useAnimation } from '../style.js'

const rotateAnimation = useAnimation({
	0: { transform: 'rotate(0) scaleX(-1)' },
	100: { transform: 'rotate(360deg) scaleX(-1)' },
})

function Project({ name, tasks }) {
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

function Task({ name, projectId, submittingState, taskId, timerEl, timerExists }, index, timers) {
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
		const timer = await db.getTimer(projectId, taskId)
		if (!timer) return
		delete timer.submittingState
		await db.updateTimer(timer)
	}

	async function onClickDelete() {
		const yes = await ConfirmPopup.show({
			message: 'Delete Timer?',
			target: this.firstChild,
		})
		if (!yes) return
		await db.deleteTimer(projectId, taskId)
	}

	async function onClickSubmit() {
		await shared.submitTimer({ projectId, taskId })
	}

	const children = []
	children.push(El('div', { style: timerStyle }, [timerEl]))
	children.push(El('div', { style: { ...labelStyle, marginRight: 'auto' } }, name))

	if (submittingState) {
		if (submittingState === 'submitting') {
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
		if (timerExists) {
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
	}

	return El('div', { style }, children)
}

export function hide() {
	overlay.hide('timers')
}

export function show() {
	let unsub

	const bodyEl = DialogBody()
	const bodyMessageStyle = {
		alignItems: 'center',
		display: 'flex',
		fontSize: 16,
		height: 90,
		justifyContent: 'center',
	}

	async function onClickDelete() {
		const yes = await ConfirmPopup.show({
			message: 'Delete All Timers?',
			target: deleteAllButtonEl.firstChild,
		})
		if (!yes) return
		await db.deleteTimers()
	}

	async function onClickSubmit() {
		const yes = await ConfirmPopup.show({
			message: 'Submit All Timers?',
			target: submitAllButtonEl.firstChild,
		})
		if (!yes) return
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

	function onClickShowPreferences() {
		PreferencesDialog.show()
	}

	async function onConnected(el) {
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'favorite-task-created':
				case 'favorite-task-deleted':
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

	const previousElMap = new Map()

	function createOrUpdateTimerEl(projectId, taskId, disabled) {
		const id = `${projectId}-${taskId}`

		const previousTimerEl = previousElMap.get(id)
		if (previousTimerEl) {
			previousTimerEl.updatableContext?.onUpdate({ disabled })
			return previousTimerEl.timerEl
		}

		const updatableContext = { projectId, taskId }
		const timerEl = Timer({ disabled, menuButton: false, updatableContext })
		getEl(timerEl).style.marginRight = ''
		previousElMap.set(id, { timerEl, updatableContext })
		return timerEl
	}

	async function update() {
		const timeout = setTimeout(() => {
			getEl(bodyEl).innerHTML = ''
			getEl(bodyEl).appendChild(El('div', { style: bodyMessageStyle }, 'LOADING...'))
		}, 500)

		const favoriteTasks = await db.getFavoriteTasks()
		const timers = await db.getTimers()
		const hasTimers = timers.length > 0

		submitAllButtonEl.style.display = hasTimers ? '' : 'none'
		deleteAllButtonEl.style.display = hasTimers ? '' : 'none'

		if (favoriteTasks.length === 0 && !hasTimers) {
			clearTimeout(timeout)
			getEl(bodyEl).innerHTML = ''
			getEl(bodyEl).appendChild(El('div', { style: bodyMessageStyle }, 'No timers started'))
			return
		}

		const projects = []
		const favoriteTasksSet = new Set()
		const projectsMap = new Map()
		const timersMap = new Map()

		for (const timer of timers) {
			const { projectId, taskId } = timer
			timersMap.set(`${projectId}-${taskId}`, timer)
		}

		if (favoriteTasks.length > 0) {
			const project = { name: 'Favorites', tasks: [] }
			projects.push(project)

			for (const { projectId, taskId } of favoriteTasks) {
				favoriteTasksSet.add(`${projectId}-${taskId}`)

				const timer = timersMap.get(`${projectId}-${taskId}`)
				const name = await cache.getTaskName({ projectId, taskId })
				const submittingState = timer?.submittingState
				const disabled = Boolean(submittingState)
				const timerEl = createOrUpdateTimerEl(projectId, taskId, disabled)

				project.tasks.push({
					name,
					projectId,
					submittingState,
					taskId,
					timerEl,
					timerExists: Boolean(timer),
				})
			}
		}

		for (const timer of timers) {
			const { projectId, submittingState, taskId } = timer

			if (favoriteTasksSet.has(`${projectId}-${taskId}`)) {
				continue
			}

			let project = projectsMap.get(projectId)
			if (!project) {
				const name = await cache.getProjectName({ projectId })
				project = { name, tasks: [] }
				projectsMap.set(projectId, project)
			}

			const name = await cache.getTaskName({ projectId, taskId })
			const disabled = Boolean(submittingState)
			const timerEl = createOrUpdateTimerEl(projectId, taskId, disabled)

			project.tasks.push({
				name,
				projectId,
				submittingState,
				taskId,
				timerEl,
				timerExists: true,
			})
		}

		const projectsWithTimers = Array.from(projectsMap.values())
		projectsWithTimers.sort((a, b) => a.name.localeCompare(b.name))
		for (const project of projectsWithTimers) {
			projects.push(project)
		}

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
				title: 'Preferences',
				onClick: onClickShowPreferences,
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
	overlay.show('timers', {}, dialogEl)
}
