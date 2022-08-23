import * as shared from '../../shared.js'
import { El } from '../../ui/el.js'
import { JobTypeSelect } from '../../ui/JobTypeSelect.js'

export default function() {
	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	const id = 'acit-job-type-select-inline'
	for (const taskFormEl of document.body.querySelectorAll('div.task_form')) {
		if (taskFormEl.querySelector(`.${id}`)) continue
		const labelEls = Array.from(taskFormEl.querySelectorAll('label'))
		const labelEl = labelEls.find(x => x.innerText === 'Time Estimation')
		if (!labelEl) continue
		const parentEl = labelEl.parentNode.parentNode

		parentEl.appendChild(El('div.form_field', [
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
		]))
	}
}
