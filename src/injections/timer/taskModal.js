import * as cache from '../../cache.js'
import * as shared from '../../shared.js'
import { El } from '../../ui/el.js'
import { Timer } from '../../ui/Timer.js'

export default async function() {
	let el

	const headerEl = document.body.querySelector('h1.task-modal-header')
	if (!headerEl) return

	const optionsEl = headerEl.parentNode.querySelector('div.task-modal-options')
	if (!optionsEl) return

	// needed as the .task-modal-header element can sometimes overlap this element (even without our additions)
	El.setStyle(optionsEl, { $: { position: 'relative', zIndex: '1' } })

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
		dataset: { projectId, taskId },
		menuButtonOptions: { alwaysVisible: true },
		style: {
			marginRight: 7,
			marginTop: 5,
		},
	}))
}
