import * as api from './api.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as preferences from './preferences.js'
import { TIMERS_WITH_SECONDS } from './env.js'

const MAX_FORMATTABLE_DURATION = TIMERS_WITH_SECONDS ? parseTime('99:59:59') : parseTime('99:59')

export function formatDuration(duration = 0, separator = ':', includeSeconds = TIMERS_WITH_SECONDS) {
	duration = Math.max(0, Math.min(MAX_FORMATTABLE_DURATION, duration))
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

export function getCurrentUser() {
	const id = angie.user_session_data.logged_user_id
	return angie.user_session_data.users.find(x => x.id === id)
}

export function getProjectIdAndMaybeTaskIdFromUrl(url) {
	let matches, projectId, taskId

	if (matches = url.search.match(/\?modal=Task-([0-9]*)-([0-9]*)/)) {
		projectId = matches[2]
		taskId = matches[1]
	}
	else if (matches = url.pathname.match(/(projects\/)([0-9]*)/)) {
		projectId = matches[2]
	}

	projectId = parseInt(projectId)
	if (isNaN(projectId)) return

	if (taskId) {
		taskId = parseInt(taskId)
		if (isNaN(taskId)) return
	}

	return { projectId, taskId }
}

export function getProjectIdAndTaskIdFromUrl(url) {
	let matches, projectId, taskId

	if (matches = url.search.match(/\?modal=Task-([0-9]*)-([0-9]*)/)) {
		projectId = matches[2]
		taskId = matches[1]
	}
	else if (matches = url.pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)/)) {
		projectId = matches[2]
		taskId = matches[5]
	}

	projectId = parseInt(projectId)
	if (isNaN(projectId)) return

	taskId = parseInt(taskId)
	if (isNaN(taskId)) return

	return { projectId, taskId }
}

export async function getTaskJobType(task) {
	const { job_type_id } = task
	if (angie.collections.job_types.some(x => x.id === job_type_id)) {
		return job_type_id
	}
	return await preferences.getTimersDefaultJobType()
}

export function getTopMostElement(className) {
	let els = Array.from(document.body.querySelectorAll(`.${className}`))
	els = els.filter(el => {
		const rect = el.getBoundingClientRect()
		return document.elementFromPoint(rect.left, rect.top) === el
	})
	if (els.length !== 1) return
	return els[0]
}

export function getTopMostElementDataSetId(className, key) {
	const el = shared.getTopMostElement(className)
	if (!el) return
	const value = parseInt(el.dataset[key])
	if (isNaN(value)) return
	return value
}

export async function getUserCanChangeIsBillable({ projectId }) {
	const project = await cache.getProject({ projectId })
	return project.members_can_change_billable
		|| angie.initial_data.settings.default_members_can_change_billable
}

export function getTimerDuration(timer) {
	if (!timer) return 0
	return timer.duration + (timer.running ? (Date.now() - timer.started_at) : 0)
}

export function isCurrentUserOwner() {
	return getCurrentUser()?.class === 'Owner'
}

export async function isTimerInDefaultState(timer) {
	if (timer.description) {
		return false
	}

	if (timer.isBillable !== undefined) {
		return false
	}

	if (getTimerDuration(timer) > 0) {
		return false
	}

	return true
}

export function isTimerSubmittable(timer) {
	return getTimerDuration(timer) > 0
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
	const timersMinimumEntry = (await preferences.getTimersMinimumEntry()) * 60 * 1000
	const timersRoundingInterval = (await preferences.getTimersRoundingInterval()) * 60 * 1000

	duration = Math.max(duration, timersMinimumEntry)

	if (timersRoundingInterval > 0) {
		duration = Math.ceil(duration / timersRoundingInterval) * timersRoundingInterval
	}

	return duration
}

export async function submitTimer({ projectId, taskId }) {
	const task = await cache.getTask({ projectId, taskId })
	const timer = await db.getTimer(projectId, taskId)

	let billableStatus = timer.isBillable
	if (typeof billableStatus !== 'boolean') {
		billableStatus = task.is_billable
	}

	const d = new Date()

	try {
		timer.submittingState = 'submitting'
		await db.updateTimer(timer)

		const duration = await roundDuration(getTimerDuration(timer))

		await api.postTimeRecord({
			billable_status: billableStatus,
			job_type_id: await getTaskJobType(task),
			project_id: projectId,
			record_date: [
				d.getFullYear(),
				(d.getMonth() + 1).toString().padStart(2, '0'),
				d.getDate().toString().padStart(2, '0'),
			].join('-'),
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
