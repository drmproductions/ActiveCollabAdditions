import * as ListPopup from './ui/popups/list.js'
import * as PreferencesDialog from './ui/dialogs/preferences.js'
import * as TimersDialog from './ui/dialogs/timers.js'
import * as api from './api.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as log from './log.js'
import * as shared from './shared.js'
import * as theme from './theme.js'
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

function createMissingElements(mutation) {
	function ChangeProjectMembersButton({ id, projectId, style }) {
		return El(`div.${id}`, {
			style: {
				color: 'var(--color-secondary)',
				cursor: 'pointer',
				fontSize: 15,
				fontWeight: 500,
				marginTop: 12,
				minHeight: 22,
				':hover': {
					textDecoration: 'underline',
				},
				...style,
			},
			async onClick() {
				await ListPopup.show({
					multi: true,
					placeholder: 'Filter users...',
					target: this,
					async onClick({ id: memberId, checked }) {
						try {
							if (checked) {
								await api.deleteProjectMember({ projectId, memberId })
							}
							else {
								await api.postProjectMember({ projectId, memberId })
							}
							return 'toggle'
						}
						catch {}
					},
					async onUpdate() {
						const members = await api.getProjectMembers({ projectId })
						const users = angie.user_session_data.users.filter(x => !x.is_archived)
						users.sort((a, b) => a.display_name.localeCompare(b.display_name))
						return users.map(({ id, display_name: text, avatar_url: imageSrc }) =>
							({ id, text, checked: members.includes(id), imageSrc }))
					},
				})
			},
		}, 'Change Members...')
	}

	function addChangeProjectMembersButtonToObjectView() {
		const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
		if (!propertyEl) return

		const id = 'acit-change-project-members-button-modal'
		if (propertyEl.querySelector(`.${id}`)) return

		const ids = shared.getProjectIdFromDocumentLocation()
		if (!ids) return
		const { projectId } = ids

		const buttonEl = ChangeProjectMembersButton({id, projectId })
		propertyEl.appendChild(buttonEl)
	}

	function addChangeProjectMembersButtonToTaskForm() {
		const wrapperEl = document.body.querySelector('div.project_tasks_add_wrapper')
		if (!wrapperEl) return

		const id = 'acit-change-project-members-button-inline'
		if (wrapperEl.querySelector(`.${id}`)) return

		const siblingEl = document.body.querySelector('div.select_assignee_new_popover')
		if (!siblingEl) return

		const ids = shared.getProjectIdFromDocumentLocation()
		if (!ids) return
		const { projectId } = ids

		const buttonEl = ChangeProjectMembersButton({
			id,
			projectId,
			style: {
				fontSize: 13,
				fontWeight: 'inherit',
				textDecoration: 'underline',
			},
		})
		siblingEl.parentNode.appendChild(buttonEl)
	}

	function addTaskToTaskModal() {
		let el

		const headerEl = document.body.querySelector('h1.task-modal-header')
		if (!headerEl) return

		const optionsEl = headerEl.parentNode.querySelector('div.task-modal-options')
		if (!optionsEl) return

		if (optionsEl.querySelector('.acit-timer')) return

		if (!(el = headerEl.querySelector('.task_name'))) return
		const taskName = el.innerText

		if (!(el = headerEl.parentNode.querySelector('span.task__projectname'))) return
		if (!(el = el.querySelector('a.project_name_task_modal'))) return
		const projectName = el.innerText

		const ids = shared.getProjectIdAndTaskIdFromDocumentLocation()
		if (!ids) return
		const { projectId, taskId } = ids

		cache.setProjectName({ projectId }, projectName)
		cache.setTaskName({ projectId, taskId }, taskName)

		optionsEl.prepend(Timer({
			menuButtonOptions: { alwaysVisible: true },
			style: {
				marginRight: 7,
				marginTop: 5,
			},
			updatableContext: { projectId, taskId },
		}))
	}

	function addTimersToTaskViewTasks() {
		for (const taskEl of document.body.querySelectorAll('div.task_view_mode')) {
			const taskNameEl = taskEl.querySelector('.task_name')
			if (!taskNameEl) continue

			taskEl.classList.add(showTimerWhenHoveringOverTaskClassName)
			if (taskEl.querySelector('.acit-timer')) continue

			const { href } = taskNameEl
			if (!href) continue

			const matches = new URL(href).pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)/)
			if (!matches) continue

			const projectId = parseInt(matches[2])
			const taskId = parseInt(matches[5])

			if (isNaN(projectId) || isNaN(taskId)) continue

			cache.setTaskName({ projectId, taskId }, taskNameEl.innerText)

			taskEl.prepend(Timer({
				style: {
					marginRight: 7,
				},
				updatableContext: { projectId, taskId },
			}))
		}
	}

	let updated = false
	const target = mutation?.target

	if (!target || target.querySelector('.object_view_sidebar')) {
		addChangeProjectMembersButtonToObjectView()
		updated = true
	}

	if (!target || target.querySelector('.task_form')) {
		addChangeProjectMembersButtonToTaskForm()
		updated = true
	}

	if (!target || target.querySelector('.task-modal-header')) {
		addTaskToTaskModal()
		updated = true
	}

	if (!target || target.querySelector('.task_view_mode')) {
		addTimersToTaskViewTasks()
		updated = true
	}

	return updated
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
	cache.preload()
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
		mutations.some(createMissingElements)
	})
	mo.observe(document.body, { childList: true, subtree: true })
	return () => mo.disconnect()
})

onUnload(() => () => {
	PreferencesDialog.hide()
	TimersDialog.hide()
})

onUnload(async () => {
	theme.update()

	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'preference-changed':
				const { key } = data
				if (key !== 'timersColorScheme' && key !== 'timersStyle') return
				theme.update()
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
	const timerEl = Timer({
		menuButtonOptions: { alwaysVisible: true, style: { marginRight: 16 } },
		style: {
			marginLeft: 8,
			pointerEvents: 'all',
			top: 9,
		},
		updatableContext,
	})

	async function update() {
		let timers = await db.getTimers()
		timers = timers.filter((timer) => shared.getTimerDuration(timer) > 0)
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
	createMissingElements()

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

log.i('', 'loaded')
