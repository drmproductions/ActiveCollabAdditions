import * as cache from '../../cache.js'
import { Timer } from '../../ui/Timer.js'
import { useStyle } from '../../ui/style.js'

const showTimerWhenHoveringOverTaskClassName = useStyle({
	':hover': {
		' .aca-timer-menu-button': {
			opacity: 1,
		},
	},
})

export default function() {
	for (const taskEl of document.body.querySelectorAll('div.task_view_mode')) {
		const taskNameEl = taskEl.querySelector('.task_name')
		if (!taskNameEl) continue

		taskEl.classList.add(showTimerWhenHoveringOverTaskClassName)
		if (taskEl.querySelector('.aca-timer')) continue

		const { href } = taskNameEl
		if (!href) continue

		const matches = new URL(href).pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)/)
		if (!matches) continue

		const projectId = parseInt(matches[2])
		const taskId = parseInt(matches[5])

		if (isNaN(projectId) || isNaN(taskId)) continue

		cache.setTaskName({ projectId, taskId }, taskNameEl.innerText)

		taskEl.prepend(Timer({
			dataset: { projectId, taskId },
			style: {
				marginRight: 7,
			},
		}))
	}
}
