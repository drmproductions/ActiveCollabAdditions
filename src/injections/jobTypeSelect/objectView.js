import * as shared from '../../shared.js'
import { El } from '../../ui/el.js'
import { JobTypeSelect } from '../../ui/JobTypeSelect.js'

export default function() {
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
