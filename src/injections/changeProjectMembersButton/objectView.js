import * as shared from '../../shared.js'
import { ChangeProjectMembersButton } from '../../ui/ChangeProjectMembersButton.js'

export default function() {
	const propertyEl = document.body.querySelector('div.object_view_property.assignee_property')
	if (!propertyEl) return

	const id = 'aca-change-project-members-button-modal'
	if (propertyEl.querySelector(`.${id}`)) return

	const ids = shared.getProjectIdAndMaybeTaskIdFromUrl(document.location)
	if (!ids) return
	const { projectId } = ids

	const buttonEl = ChangeProjectMembersButton({ id, projectId })
	propertyEl.appendChild(buttonEl)
}
