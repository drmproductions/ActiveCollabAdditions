import * as TimersDialog from './ui/dialogs/timers.js'
import * as api from './api.js'
import * as bus from './bus.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as shared from './shared.js'
import { AssigneeSelect } from './ui/AssigneeSelect.js'
import { ChangeProjectMembersButton } from './ui/ChangeProjectMembersButton.js'
import { El } from './ui/el.js'
import { JobTypeSelect } from './ui/JobTypeSelect.js'
import { Timer } from './ui/Timer.js'
import { useStyle } from './ui/style.js'

api.intercept(/(projects\/)([0-9]*)(\/)(tasks)$/, async ({ method, options }) => {
	if (method !== 'post') return
	if (typeof options.body !== 'string') return

	try {
		const body = JSON.parse(options.body)
		const assigneeId = shared.getTopMostElementDataSetId('acit-assignee-select-inline', 'assigneeId')
		if (assigneeId !== undefined) {
			body.assignee_id = assigneeId
		}
		const jobTypeId = shared.getTopMostElementDataSetId('acit-job-type-select-inline', 'jobTypeId')
		if (jobTypeId !== undefined) {
			body.job_type_id = jobTypeId
		}
		options.body = JSON.stringify(body)
	}
	catch {}
})

api.intercept(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)$/, async ({ matches, method, options }) => {
	if (method !== 'put') return
	if (typeof options.body !== 'string') return

	let jobTypeId
	const el = shared.getTopMostElement('acit-job-type-select-inline')
	if (el) {
		jobTypeId = parseInt(el.dataset.jobTypeId)
		if (isNaN(jobTypeId)) jobTypeId = undefined
	}

	try {
		const body = JSON.parse(options.body)

		if (typeof jobTypeId === 'number') {
			body.job_type_id = jobTypeId
		}

		// when estimate === '0' the job_type_id gets cleared by the backend
		// so lets prevent an unchanged estimate from clearing the job_type_id
		// NOTE this doesn't handle the fact that setting a time estimation to zero clears the job type.
		//      we'd probably need to make another request to put it back to it's previous value, but I
		//      was told clearing a time estimation is a pretty rare event
		if (typeof body.estimate === 'string') {
			const estimate = parseInt(body.estimate)
			if (!isNaN(estimate)) {
				const projectId = parseInt(matches[2])
				const taskId = parseInt(matches[5])
				const task = await cache.getTask({ projectId, taskId })
				if (task.estimate === estimate) {
					delete body.estimate
				}
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
		funcSet.add(injectAssigneeSelectIntoObjectView)
		funcSet.add(injectJobTypeSelectIntoObjectView)

		if (shared.isCurrentUserOwner()) {
			funcSet.add(injectChangeProjectMembersButtonIntoObjectView)
		}
	}

	if (target.querySelector('.task_form')) {
		funcSet.add(injectAssigneeSelectIntoTaskForm)
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

	injectAssigneeSelectIntoObjectView()
	injectAssigneeSelectIntoTaskForm()
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
	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	const id = 'acit-job-type-select-inline'
	for (const taskFormEl of document.body.querySelectorAll('div.task_form')) {
		if (taskFormEl.querySelector(`.${id}`)) continue
		const labelEls = Array.from(taskFormEl.querySelectorAll('label'))
		const labelEl = labelEls.find(x => x.innerText === 'Assignee')
		if (!labelEl) continue
		const parentEl = labelEl.parentNode.parentNode

		parentEl.insertBefore(El('div.form_field', [
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
		]), labelEl.parentNode)
	}
}

function injectAssigneeSelectIntoObjectView() {
	const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
	if (!propertyEl) return

	const id = 'acit-assignee-select-modal'
	if (propertyEl.querySelector(`.${id}`)) return

	const oldEl = propertyEl.querySelector('button')
	if (!oldEl) return

	const ids = shared.getProjectIdAndTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	const el = AssigneeSelect({ id, projectId, taskId, realtime: true })
	oldEl.replaceWith(el)
}

function injectAssigneeSelectIntoTaskForm() {
	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const id = 'acit-assignee-select-inline'
	for (const taskFormEl of document.body.querySelectorAll('div.task_form')) {
		if (taskFormEl.querySelector(`.${id}`)) continue
		const labelEls = Array.from(taskFormEl.querySelectorAll('label'))
		const labelEl = labelEls.find(x => x.innerText === 'Assignee')
		if (!labelEl) continue

		const oldEl = labelEl.parentNode.querySelector('div.select_assignee_new_popover')
		if (!oldEl) continue

		const el = AssigneeSelect({
			id,
			projectId,
			style: {
				fontSize: 13,
				fontWeight: 'inherit',
				minHeight: 'unset',
				textDecoration: 'underline',
			},
		})
		oldEl.replaceWith(el)
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
	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const id = 'acit-change-project-members-button-inline'
	for (const taskFormEl of document.body.querySelectorAll('div.task_form')) {
		if (taskFormEl.querySelector(`.${id}`)) continue
		const labelEls = Array.from(taskFormEl.querySelectorAll('label'))
		const labelEl = labelEls.find(x => x.innerText === 'Assignee')
		if (!labelEl) continue
		const parentEl = labelEl.parentNode

		const el = ChangeProjectMembersButton({
			id,
			projectId,
			style: {
				fontSize: 13,
				fontWeight: 'inherit',
				minHeight: 'unset',
				textDecoration: 'underline',
			},
		})
		parentEl.appendChild(el)
	}
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
