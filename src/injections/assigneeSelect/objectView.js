import * as shared from '../../shared.js'
import { AssigneeSelect } from '../../ui/AssigneeSelect.js'

export default function() {
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
