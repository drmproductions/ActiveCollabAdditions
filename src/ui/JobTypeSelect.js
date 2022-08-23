import * as ListPopup from './popups/list.js'
import * as api from '../api.js'
import * as cache from '../cache.js'
import { El } from './el.js'

let lastValue = 0

export function JobTypeSelect({ id, projectId, taskId, realtime, style }) {
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
					lastValue = id
					if (realtime && taskId) {
						await api.putTask({ projectId, taskId }, { job_type_id: id })
					}
					await update(false)
					return 'hide'
				},
				async onUpdate() {
					let jobTypeId = parseInt(el.dataset.jobTypeId)
					if (taskId) {
						const task = await cache.getTask({ projectId, taskId })
						jobTypeId = task.job_type_id
					}
					if (isNaN(jobTypeId)) jobTypeId = 0
					let jobTypes = angie.collections.job_types.filter(x => !x.is_archived)
					jobTypes.unshift({ id: 0, name: 'No Job Type...' })
					jobTypes = jobTypes.map(({ id, name: text }) =>
						({ id, text, checked: id === jobTypeId }))
					return jobTypes
				},
			})
		},
	})

	async function update(firstUpdate) {
		let jobTypeId = JobTypeSelect.getLastValue(id)
		if ((firstUpdate || realtime) && taskId) {
			const task = await cache.getTask({ projectId, taskId })
			jobTypeId = task.job_type_id
		}
		const jobType = angie.collections.job_types.find(x => x.id === jobTypeId)
		el.innerText = jobType?.name ?? 'No Job Type...'
		el.dataset.jobTypeId = jobTypeId ?? 0
	}

	update(true)

	return el
}

JobTypeSelect.getLastValue = () => {
	if (!angie.collections.job_types.some(x => x.id === lastValue)) {
		lastValue = undefined
	}
	return lastValue
}
