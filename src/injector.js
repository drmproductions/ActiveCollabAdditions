import * as api from './api.js'
import * as cache from './cache.js'
import * as log from './log.js'
import * as shared from './shared.js'
import { AssigneeSelect } from './ui/AssigneeSelect.js'
import { JobTypeSelect } from './ui/JobTypeSelect.js'
import { useStyle } from './ui/style.js'

import injectAssigneeSelectIntoObjectView from './injections/assigneeSelect/objectView.js'
import injectChangeProjectMembersButtonIntoObjectView from './injections/changeProjectMembersButton/objectView.js'
import injectJobTypeSelectIntoObjectView from './injections/jobTypeSelect/objectView.js'

import injectAssigneeSelectIntoTaskForm from './injections/assigneeSelect/taskForm.js'
import injectChangeProjectMembersButtonIntoTaskForm from './injections/changeProjectMembersButton/taskForm.js'
import injectJobTypeSelectIntoTaskForm from './injections/jobTypeSelect/taskForm.js'

import injectTimerIntoTaskModal from './injections/timer/taskModal.js'
import injectTimerIntoTaskViewTasks from './injections/timer/taskViewTasks.js'
import injectTimerIntoTopBar from './injections/timer/topBar.js'

import injectUserPageGroupTasksBySelector from './injections/userPageGroupTasksBySelector.js'

api.intercept(/(projects\/)([0-9]*)(\/)(tasks)$/, async ({ method, options }) => {
	if (method !== 'post') return
	if (typeof options.body !== 'string') return

	try {
		const body = JSON.parse(options.body)

		const assigneeId = AssigneeSelect.getLastValue()
		if (assigneeId !== undefined) {
			body.assignee_id = assigneeId
		}

		const jobTypeId = JobTypeSelect.getLastValue()
		if (jobTypeId !== undefined) {
			body.job_type_id = jobTypeId
		}

		options.body = JSON.stringify(body)
	}
	catch (e) {
		log.e('injector', e)
	}
})

api.intercept(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)$/, async ({ matches, method, options }) => {
	if (method !== 'put') return
	if (typeof options.body !== 'string') return

	try {
		const body = JSON.parse(options.body)

		const projectId = parseInt(matches[2])
		const taskId = parseInt(matches[5])
		const task = await cache.getTask({ projectId, taskId })

		const assigneeId = AssigneeSelect.getLastValue()
		if (assigneeId !== undefined && assigneeId !== task.assignee_id) {
			body.assignee_id = assigneeId
		}

		const jobTypeId = JobTypeSelect.getLastValue()
		if (jobTypeId !== undefined && jobTypeId !== task.job_type_id) {
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
				if (task.estimate === estimate) {
					delete body.estimate
				}
			}
		}

		options.body = JSON.stringify(body)
	}
	catch (e) {
		log.e('injector', e)
	}
})

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
	injectTimerIntoTaskViewTasks()
	const unsub = injectTimerIntoTopBar()

	const mutationObserver = new MutationObserver((mutations) => {
		const funcSet = new Set()
		for (const { target } of mutations) {
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
				funcSet.add(injectTimerIntoTaskViewTasks)
			}

			if (target.querySelector('.profile_page_tasks')) {
				funcSet.add(injectUserPageGroupTasksBySelector)
			}
		}
		for (const func of funcSet.values()) {
			func()
		}
	})
	mutationObserver.observe(document.body, { childList: true, subtree: true })

	return () => {
		mutationObserver.disconnect()
		unsub?.()

		document.body.querySelectorAll('.aca-top-bar-timer-wrapper')?.remove()
		document.body.querySelectorAll('.aca-top-bar-timers-button')?.remove()
		for (const el of document.body.querySelectorAll('.aca-timer')) {
			el.remove()
		}
	}
}
