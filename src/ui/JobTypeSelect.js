import * as ListPopup from './popups/list.js'
import * as cache from '../cache.js'
import * as shared from '../shared.js'
import { El } from './el.js'

export function JobTypeSelect({ id, projectId, taskId, style }) {
	const el = El(`div.${id}`, {
		style: {
			color: 'var(--color-secondary)',
			cursor: 'pointer',
			fontSize: 15,
			fontWeight: 500,
			minHeight: 22,
			':hover': {
				textDecoration: 'underline',
			},
			...style,
		},
		async onClick() {
			await ListPopup.show({
				placeholder: 'Choose a job type',
				target: this,
				async onClick({ id }) {
					await shared.updateTask({ projectId, taskId }, { job_type_id: id })
					await update()
					return 'hide'
				},
				async onUpdate() {
					const { job_type_id } = await cache.getTask({ projectId, taskId })
					let jobTypes = angie.user_session_data.job_types.filter(x => !x.is_archived)
					jobTypes.unshift({ id: 0, name: 'No Job Type...' })
					jobTypes = jobTypes.map(({ id, name: text }) =>
						({ id, text, checked: id === job_type_id }))
					return jobTypes
				},
			})
		},
	})

	async function update() {
		const { job_type_id } = await cache.getTask({ projectId, taskId })
		const jobType = angie.user_session_data.job_types.find(x => x.id === job_type_id)
		el.innerText = jobType?.name ?? 'No Job Type...'
	}

	update()

	return El(`div.object_view_property.${id}`, [
		El('label', 'Job Type'),
		el,
	])
}
