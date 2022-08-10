import * as api from './api.js'
import * as cache from './cache.js'
import * as db from './db.js'
import { TIMERS_WITH_SECONDS } from './env.js'

export function formatDuration(duration = 0, separator = ':', includeSeconds = TIMERS_WITH_SECONDS) {
	duration /= 1000

	const parts = []
	let consumedSeconds = 0

	const hours = Math.floor(duration / 3600)
	consumedSeconds += (hours * 3600)
	parts.push(hours.toString().padStart(2, '0'))

	const minutes = Math.floor((duration - consumedSeconds) / 60)
	consumedSeconds += (minutes * 60)
	parts.push(minutes.toString().padStart(2, '0'))

	if (includeSeconds) {
		const seconds = Math.floor(duration - consumedSeconds)
		parts.push(seconds.toString().padStart(2, '0'))
	}

	return parts.join(separator)
}

export function getTimerDuration(timer) {
	if (!timer) return 0
	return timer.duration + (timer.running ? (Date.now() - timer.started_at) : 0)
}

// returns time in milliseconds
export function parseTime(time) {
	const parts = time.split(':')
	let pow = 2 // hours
	let duration = 0
	for (let part of parts) {
		part = parseInt(part)
		if (isNaN(part)) throw new Error('Invalid time format.')
		duration += part * Math.max(1, 60 ** pow)
		pow--
	}
	return duration * 1000
}

export async function roundDuration(duration) {
	const timersMinimumEntry = (await db.getPreference('timersMinimumEntry') ?? 0) * 60 * 1000
	const timersRoundingInterval = (await db.getPreference('timersRoundingInterval') ?? 0) * 60 * 1000

	duration = Math.max(duration, timersMinimumEntry)

	if (timersRoundingInterval > 0) {
		duration = Math.ceil(duration / timersRoundingInterval) * timersRoundingInterval
	}

	return duration
}

export async function submitTimer({ projectId, taskId }) {
	const timer = await db.getTimer(projectId, taskId)

	let billableStatus = timer.isBillable
	if (typeof billableStatus !== 'boolean') {
		const res = await cache.getTask({ projectId, taskId })
		billableStatus = res.single.is_billable
	}

	const d = new Date()
	const recordDate = `${d.getFullYear()}-${d.getMonth().toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`

	const jobTypeId = timer.jobTypeId ?? await db.getSetting('timersDefaultJobType') ?? angie.collections.job_types[0]?.id

	try {
		timer.submittingState = 'submitting'
		await db.updateTimer(timer)

		const duration = roundDuration(getTimerDuration(timer))

		await api.postTimeRecord({
			billable_status: billableStatus,
			job_type_id: jobTypeId,
			project_id: projectId,
			record_date: recordDate,
			summary: timer.description ?? '',
			task_id: taskId,
			user_id: angie.user_session_data.logged_user_id,
			value: formatDuration(duration, undefined, false),
		})

		await db.deleteTimer(projectId, taskId)
	}
	catch (e) {
		delete timer.submittingState
		await db.updateTimer(timer)
		// TODO show the error
	}
}
