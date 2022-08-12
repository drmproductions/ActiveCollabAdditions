import * as cache from './cache.js'
import { ChangeProjectMembersButton } from './ui/ChangeProjectMembersButton.js'
import { Timer } from './ui/timer.js'
import { getTopEl } from './ui/el.js'
import { useStyle } from './ui/style.js'

const showTimerWhenHoveringOverTaskClassName = useStyle({
	':hover': {
		' .acit-timer-menu-button': {
			opacity: 1,
		},
	},
})

let mutationObserver

export function deinit() {
	mutationObserver.disconnect()
	mutationObserver = undefined

	const els = document.body.querySelectorAll('.acit-timer')
	for (const el of els) {
		getTopEl(el).remove()
	}
}

function getFunc(target) {
	if (target.querySelector('.object_view_sidebar')) return injectChangeProjectMembersButtonIntoObjectView
	if (target.querySelector('.task_form')) return injectChangeProjectMembersButtonIntoTaskForm
	if (target.querySelector('.task-modal-header')) return injectTaskIntoTaskModal
	if (target.querySelector('.task_view_mode')) return injectTimersIntoTaskViewTasks
}

export function init() {
	injectChangeProjectMembersButtonIntoObjectView()
	injectChangeProjectMembersButtonIntoTaskForm()
	injectTaskIntoTaskModal()
	injectTimersIntoTaskViewTasks()

	mutationObserver = new MutationObserver((mutations) => {
		const funcSet = new Set()
		for (const { target } of mutations) {
			const func = getFunc(target)
			if (func) funcSet.add(func)
		}
		for (const func of funcSet.values()) {
			func()
		}
	})
	mutationObserver.observe(document.body, { childList: true, subtree: true })
}

function injectChangeProjectMembersButtonIntoObjectView() {
	const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
	if (!propertyEl) return

	const id = 'acit-change-project-members-button-modal'
	if (propertyEl.querySelector(`.${id}`)) return

	const ids = shared.getProjectIdFromDocumentLocation()
	if (!ids) return
	const { projectId } = ids

	const buttonEl = ChangeProjectMembersButton({ id, projectId })
	propertyEl.appendChild(buttonEl)
}

function injectChangeProjectMembersButtonIntoTaskForm() {
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

function injectTaskIntoTaskModal() {
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

function injectTimersIntoTaskViewTasks() {
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
