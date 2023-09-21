import * as shared from '../../shared.js'
import { El } from '../../ui/el.js'
import { JobTypeSelect } from '../../ui/JobTypeSelect.js'

export default function() {
	const ids = shared.getProjectIdAndTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId, taskId } = ids

	const id = 'aca-job-type-select-modal'
	for (const objectViewEl of document.body.querySelectorAll('div.object_view')) {
		if (objectViewEl.querySelector(`.${id}`)) continue
		const labelEls = Array.from(objectViewEl.querySelectorAll('label'))
		const labelEl = labelEls.find(x => x.innerText === 'Time Estimation')
		if (!labelEl) continue
		const objectViewPropertyEl = labelEl.parentNode
		const objectViewPropertiesEl = objectViewPropertyEl.parentNode
		objectViewPropertiesEl.insertBefore(El('div.object_view_property', [
			El('label', 'Job Type'),
			JobTypeSelect({ id, projectId, taskId, realtime: true }),
		]), objectViewPropertyEl.nextElementSibling)
	}
}
