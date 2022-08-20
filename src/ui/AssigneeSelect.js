import * as ListPopup from './popups/list.js'
import * as api from '../api.js'
import * as cache from '../cache.js'
import { El } from './el.js'

export function AssigneeSelect({ id, projectId, taskId, realtime, style }) {
	const el = El(`div.${id}`, {
		style: {
			color: 'var(--color-secondary)',
			cursor: 'pointer',
			fontSize: 15,
			fontWeight: 500,
			marginTop: 12,
			minHeight: 22,
			':hover': {
				textDecoration: 'underline',
			},
			...style,
		},
		async onClick() {
			await ListPopup.show({
				placeholder: 'Choose an assignee',
				target: this,
				async onClick({ id }) {
					if (realtime && taskId) {
						await api.putTask({ projectId, taskId }, { assignee_id: id })
					}
					await update(id)
					return 'hide'
				},
				async onUpdate() {
					let assigneeId = parseInt(el.dataset.assigneeId)
					if (taskId) {
						const task = await cache.getTask({ projectId, taskId })
						assigneeId = task.assignee_id
					}
					const project = await cache.getProject({ projectId })
					const membersSet = new Set(project.members)
					const users = angie.user_session_data.users.filter(x => membersSet.has(x.id))
					users.sort((a, b) => a.display_name.localeCompare(b.display_name))
					users.unshift({ id: 0, display_name: 'No Assignee...' })
					return users.map(({ id, display_name: text, avatar_url: imageSrc }) =>
						({ id, text, checked: id === assigneeId, imageSrc }))
				},
			})
		},
	})

	async function update(assigneeId) {
		if (taskId) {
			if (realtime || !assigneeId) {
				const task = await cache.getTask({ projectId, taskId })
				assigneeId = task.assignee_id
			}
		}
		const user = angie.user_session_data.users.find(x => x.id === assigneeId)
		el.innerText = user?.display_name ?? 'No Assignee...'
		el.dataset.assigneeId = assigneeId ?? 0
	}

	update()

	return el
}
