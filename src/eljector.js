import * as TimersDialog from './ui/dialogs/timers.js'
import * as api from './api.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as shared from './shared.js'
import { ChangeProjectMembersButton } from './ui/ChangeProjectMembersButton.js'
import { El } from './ui/el.js'
import { JobTypeSelect } from './ui/JobTypeSelect.js'
import { Timer } from './ui/Timer.js'
import { useStyle } from './ui/style.js'

api.intercept(/(projects\/)([0-9]*)(\/)(tasks)$/, async ({ method, options }) => {
	if (method !== 'post') return
	if (typeof options.body !== 'string') return

	const el = getTopMostInlineJobTypeSelectElement()
	if (!el) return

	const id = parseInt(el.dataset.jobTypeId)
	if (!id) return

	try {
		const body = JSON.parse(options.body)
		body.job_type_id = id
		options.body = JSON.stringify(body)
	}
	catch {}
})

// NOTE this doesn't handle the fact that setting a time estimation to zero clears the
api.intercept(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)$/, async ({ matches, method, options }) => {
	console.log('put', method, options)
	if (method !== 'put') return
	if (typeof options.body !== 'string') return

	let jobTypeId
	const el = getTopMostInlineJobTypeSelectElement()
	if (el) {
		jobTypeId = parseInt(el.dataset.jobTypeId)
		if (isNaN(jobTypeId)) jobTypeId = undefined
	}

	try {
		const body = JSON.parse(options.body)

		if (typeof jobTypeId === 'number') {
			body.job_type_id = id
		}

		// when estimate === '0' the job_type_id gets cleared by the backend (even if we pass to it)
		// so lets prevent an unchanged estimate from clearing the job_type_id
		if (typeof body.estimate === 'string') {
			console.log('here?')
			const projectId = parseInt(matches[2])
			const taskId = parseInt(matches[5])
			const task = await cache.getTask({ projectId, taskId })
			console.log(task.estimate, body.estimate)
			if (task.estimate === body.estimate) {
				console.log('estimate unchanged, removing from request')
				delete body.estimate
			}
		}

		options.body = JSON.stringify(body)
	}
	catch {}
})

const showTimerWhenHoveringOverTaskClassName = useStyle({
	':hover': {
		' .acit-timer-menu-button': {
			opacity: 1,
		},
	},
})

function addFuncs(funcSet, target) {
	if (target.querySelector('.object_view_sidebar')) {
		funcSet.add(injectJobTypeSelectIntoObjectView)

		if (shared.isCurrentUserOwner()) {
			funcSet.add(injectChangeProjectMembersButtonIntoObjectView)
		}
	}

	if (target.querySelector('.task_form')) {
		funcSet.add(injectJobTypeSelectIntoTaskForm)

		if (shared.isCurrentUserOwner()) {
			funcSet.add(injectChangeProjectMembersButtonIntoTaskForm)
		}
	}

	if (target.querySelector('.task-modal-header')) {
		funcSet.add(injectTimerIntoTaskModal)
	}

	if (target.querySelector('.task_view_mode')) {
		funcSet.add(injectTimersIntoTaskViewTasks)
	}
}

function getTopMostInlineJobTypeSelectElement() {
	let els = Array.from(document.body.querySelectorAll('.acit-job-type-select-inline'))
	els = els.filter(el => {
		const rect = el.getBoundingClientRect()
		return document.elementFromPoint(rect.left, rect.top) === el
	})
	if (els.length !== 1) return
	return els[0]
}

export function init() {
	document.body.classList.add(useStyle({
		// decrease project header max width to account for our injected elements
		' .project-header': {
			width: 'calc(100% - 344px) !important',
			// this is an unnecessary div that causes layout issues
			' > .tw-w-32.tw-h-full': {
				display: 'none',
			},
		},
	}))

	injectJobTypeSelectIntoObjectView()
	injectJobTypeSelectIntoTaskForm()
	if (shared.isCurrentUserOwner()) {
		injectChangeProjectMembersButtonIntoObjectView()
		injectChangeProjectMembersButtonIntoTaskForm()
	}
	injectTimerIntoTaskModal()
	injectTimersIntoTaskViewTasks()
	const unsub = injectTimerIntoTopBar()

	const mutationObserver = new MutationObserver((mutations) => {
		const funcSet = new Set()
		for (const { target } of mutations) {
			addFuncs(funcSet, target)
		}
		for (const func of funcSet.values()) {
			func()
		}
	})
	mutationObserver.observe(document.body, { childList: true, subtree: true })

	return () => {
		mutationObserver.disconnect()
		unsub?.()

		document.body.querySelectorAll('.acit-top-bar-timer-wrapper')?.remove()
		document.body.querySelectorAll('.acit-top-bar-timers-button')?.remove()
		for (const el of document.body.querySelectorAll('.acit-timer')) {
			el.remove()
		}
	}
}

function injectTimerIntoTopBar() {
	const containerEl = document.querySelector('.topbar_items')
	if (!containerEl) return

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
				timerEl.title = `${projectName} - ${taskName}`
			}
		}
	}

	update()

	containerEl.prepend(El('li.topbar_item.acit-top-bar-timers-button', {
		onClick() {
			TimersDialog.show()
		},
	}, [
		El('button.btn', [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_time_tracker_icon,
				style: {
					alignItems: 'center',
					display: 'flex !important',
					justifyContent: 'center',
				},
			}),
		]),
	]))

	containerEl.prepend(El('li.topbar_item.acit-top-bar-timer-wrapper', {
		style: {
			margin: 0,
			width: 'fit-content !important',
		},
	}, [timerEl]))

	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'timer-created':
			case 'timer-deleted':
			case 'timer-updated':
			case 'timers-deleted':
				update()
				break
		}
	})
}

function injectJobTypeSelectIntoObjectView() {
	const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
	if (!propertyEl) return

	const { parentNode } = propertyEl

	const id = 'acit-job-type-select-modal'
	if (parentNode.querySelector(`.${id}`)) return

	const ids = shared.getProjectIdAndTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	parentNode.insertBefore(El('div.object_view_property', [
		El('label', 'Job Type'),
		JobTypeSelect({ id, projectId, taskId, realtime: true }),
	]), propertyEl)
}

function injectJobTypeSelectIntoTaskForm() {
	for (const wrapperEl of document.body.querySelectorAll('div.task_form')) {
		const id = 'acit-job-type-select-inline'
		if (wrapperEl.querySelector(`.${id}`)) continue

		const siblingEl = wrapperEl.querySelector('div.select_assignee_new_popover')
		if (!siblingEl) continue

		const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
		if (!ids) continue
		const { projectId, taskId } = ids

		siblingEl.parentNode.parentNode.insertBefore(El('div.form_field', [
			El('label', 'Job Type'),
			JobTypeSelect({
				id,
				projectId,
				taskId,
				realtime: false,
				style: {
					fontSize: 13,
					fontWeight: 'inherit',
					minHeight: 'unset',
					textDecoration: 'underline',
				},
			}),
		]), siblingEl.parentNode)
	}
}

function injectChangeProjectMembersButtonIntoObjectView() {
	const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
	if (!propertyEl) return

	const id = 'acit-change-project-members-button-modal'
	if (propertyEl.querySelector(`.${id}`)) return

	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const buttonEl = ChangeProjectMembersButton({ id, projectId })
	propertyEl.appendChild(buttonEl)
}

function injectChangeProjectMembersButtonIntoTaskForm() {
	const wrapperEl = document.body.querySelector('div.task_form')
	if (!wrapperEl) return

	const id = 'acit-change-project-members-button-inline'
	if (wrapperEl.querySelector(`.${id}`)) return

	const siblingEl = document.body.querySelector('div.select_assignee_new_popover')
	if (!siblingEl) return

	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const buttonEl = ChangeProjectMembersButton({
		id,
		projectId,
		style: {
			fontSize: 13,
			fontWeight: 'inherit',
			minHeight: 'unset',
			textDecoration: 'underline',
		},
	})
	siblingEl.parentNode.appendChild(buttonEl)
}

async function injectTimerIntoTaskModal() {
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

	const ids = shared.getProjectIdAndTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	cache.setProjectName({ projectId }, projectName)
	cache.setTaskName({ projectId, taskId }, taskName)

	const project = await cache.getProject({ projectId })
	if (!project.is_tracking_enabled) return

	optionsEl.prepend(Timer({
		menuButtonOptions: { alwaysVisible: true },
		style: {
			marginRight: 7,
			marginTop: 5,
		},
		updatableContext: { projectId, taskId },
	}))
}

async function injectTimersIntoTaskViewTasks() {
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

		const project = await cache.getProject({ projectId })
		if (!project.is_tracking_enabled) continue

		taskEl.prepend(Timer({
			style: {
				marginRight: 7,
			},
			updatableContext: { projectId, taskId },
		}))
	}
}
