import * as shared from '../../shared.js'
import { AssigneeSelect } from '../../ui/AssigneeSelect.js'

export default function() {
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
