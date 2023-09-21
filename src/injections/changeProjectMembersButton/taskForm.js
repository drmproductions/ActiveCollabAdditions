import * as shared from '../../shared.js'
import { ChangeProjectMembersButton } from '../../ui/ChangeProjectMembersButton.js'

export default function() {
	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const id = 'aca-change-project-members-button-inline'
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
