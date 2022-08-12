import * as ListPopup from './popups/list.js'
import * as api from '../api.js'
import { El } from './el.js'

export function ChangeProjectMembersButton({ id, projectId, style }) {
	return El(`div.${id}`, {
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
				multi: true,
				placeholder: 'Filter users...',
				target: this,
				async onClick({ id: memberId, checked }) {
					try {
						if (checked) {
							await api.deleteProjectMember({ projectId, memberId })
						}
						else {
							await api.postProjectMember({ projectId, memberId })
						}
						return 'toggle'
					}
					catch { }
				},
				async onUpdate() {
					const members = await api.getProjectMembers({ projectId })
					const users = angie.user_session_data.users.filter(x => !x.is_archived)
					users.sort((a, b) => a.display_name.localeCompare(b.display_name))
					return users.map(({ id, display_name: text, avatar_url: imageSrc }) =>
						({ id, text, checked: members.includes(id), imageSrc }))
				},
			})
		},
	}, 'Change Members...')
}
