import * as ConfirmPopup from '../popups/confirm.js'
import * as PreferencesDialog from './preferences.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as overlay from '../overlay.js'
import * as shared from '../../shared.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
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

function Task({ isTimerSubmittable, name, projectId, submittingState, taskId, timerEl }, index, timers) {
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

	async function onClickClear() {
		const yes = await ConfirmPopup.show({
			message: 'Clear Timer?',
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
		if (isTimerSubmittable) {
			children.push(El('div', { style: buttonStyle, title: 'Submit', onClick: onClickSubmit }, [
				El('span.icon', {
					innerHTML: angie.icons.svg_icons_icon_submit_time,
					style: { ...iconStyle, scale: 1.2 },
				}),
			]))
			children.push(El('div', { style: buttonStyle, title: 'Clear...', onClick: onClickClear }, [
				El('span.icon', {
					innerHTML: angie.icons.main_menu_icon_trash,
					style: { ...iconStyle, scale: 1.05 },
				}),
			]))
		}
		children.push(El('div', { style: buttonStyle }, [
			TimerMenuButton({ alwaysVisible: true, dialogOptions: { centered: true }, updatableContext: { projectId, taskId } }),
		]))
	}

	return El('div', { style }, children)
}

export function hide() {
	overlay.hide('timers')
}

export function show() {
	let unsub

	const bodyEl = DialogBody()

	async function onClickClearAll() {
		const yes = await ConfirmPopup.show({
			message: 'Clear All Timers?',
			target: this.firstChild,
		})
		if (!yes) return
		await db.deleteTimers()
	}

	async function onClickSubmitAll() {
		const yes = await ConfirmPopup.show({
			message: 'Submit All Timers?',
			target: this.firstChild,
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
		title: 'Submit All...',
		onClick: onClickSubmitAll,
	})

	const deleteAllButtonEl = DialogHeaderButton({
		icon: angie.icons.main_menu_icon_trash,
		iconStyleExtra: { scale: 1.2 },
		title: 'Clear All...',
		onClick: onClickClearAll,
	})

	const messageEl = El('div', {
		style: {
			alignItems: 'center',
			display: 'flex',
			fontSize: 16,
			height: 90,
			justifyContent: 'center',
		},
	})

	const previousElMap = new Map()

	function updateMessage(message) {
		messageEl.innerText = message
	}

	function showMessage() {
		bodyEl.innerHTML = ''
		bodyEl.appendChild(messageEl)
	}

	function createOrUpdateTimerEl(projectId, taskId, disabled) {
		const id = `${projectId}-${taskId}`

		const previousTimerEl = previousElMap.get(id)
		if (previousTimerEl) {
			previousTimerEl.updatableContext?.onUpdate({ disabled })
			return previousTimerEl.timerEl
		}

		const updatableContext = { projectId, taskId }
		const timerEl = Timer({
			disabled,
			menuButton: false,
			updatableContext,
		})
		previousElMap.set(id, { timerEl, updatableContext })
		return timerEl
	}

	async function update() {
		updateMessage('Loading...')

		const timeout = setTimeout(() => {
			showMessage()
		}, 500)

		const favoriteTasks = await db.getFavoriteTasks()
		const timers = await db.getTimers()
		const hasSubmittableTimer = timers.some(x => shared.isTimerSubmittable(x))

		submitAllButtonEl.style.display = hasSubmittableTimer ? '' : 'none'
		deleteAllButtonEl.style.display = hasSubmittableTimer ? '' : 'none'

		if (favoriteTasks.length === 0 && !hasTimers) {
			clearTimeout(timeout)
			updateMessage('No timers started')
			showMessage()
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
			for (const { projectId, taskId } of favoriteTasks) {
				favoriteTasksSet.add(`${projectId}-${taskId}`)
			}
		}

		let totalTasksLoaded = 0
		let totalTasks = favoriteTasks.length + timers.filter(({ projectId, taskId }) => !favoriteTasksSet.has(`${projectId}-${taskId}`)).length

		if (favoriteTasks.length > 0) {
			const project = { name: 'Favorites', tasks: [] }
			projects.push(project)

			for (const { projectId, taskId } of favoriteTasks) {
				updateMessage(`Loading task ${++totalTasksLoaded}/${totalTasks}...`)
				const timer = timersMap.get(`${projectId}-${taskId}`)
				const name = await cache.getTaskName({ projectId, taskId })
				const submittingState = timer?.submittingState
				const disabled = Boolean(submittingState)
				const timerEl = createOrUpdateTimerEl(projectId, taskId, disabled)

				project.tasks.push({
					isTimerSubmittable: timer && shared.isTimerSubmittable(timer),
					name,
					projectId,
					submittingState,
					taskId,
					timerEl,
				})
			}
		}

		for (const timer of timers) {
			const { projectId, submittingState, taskId } = timer

			if (favoriteTasksSet.has(`${projectId}-${taskId}`)) {
				continue
			}

			updateMessage(`Loading task ${++totalTasksLoaded}/${totalTasks}...`)

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
				isTimerSubmittable: shared.isTimerSubmittable(timer),
				name,
				projectId,
				submittingState,
				taskId,
				timerEl,
			})
		}

		const projectsWithTimers = Array.from(projectsMap.values())
		projectsWithTimers.sort((a, b) => a.name.localeCompare(b.name))
		for (const project of projectsWithTimers) {
			projects.push(project)
		}

		clearTimeout(timeout)
		bodyEl.innerHTML = ''
		for (const project of projects) {
			project.tasks.sort((a, b) => a.name.localeCompare(b.name))
			bodyEl.appendChild(Project(project))
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
