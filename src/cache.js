import * as api from './api.js'

const cache = new Map()

export async function getProject({ projectId }) {
	return await useCache(`project-${projectId}`, async () => {
		return await api.getProject({ projectId })
	})
}

export async function getProjectName({ projectId }) {
	return await useCache(`project-name-${projectId}`, async () => {
		const res = await api.getProject({ projectId })
		return res.single.name
	})
}

export async function getTask({ projectId, taskId }) {
	return await useCache(`task-${projectId}-${taskId}`, async () => {
		return await api.getTask({ projectId, taskId })
	})
}

export async function getTaskName({ projectId, taskId }) {
	return await useCache(`task-name-${projectId}-${taskId}`, async () => {
		const res = await api.getTask({ projectId, taskId })
		return res.single.name
	})
}

export async function set(key, value) {
	cache.set(key, value)
}

export async function setTaskName({ projectId, taskId, name }) {
	cache.set(`task-name-${projectId}-${taskId}`, name)
}

export async function useCache(key, func) {
	if (cache.has(key)) {
		return cache.get(key)
	}
	const value = await func()
	cache.set(key, value)
	return value
}
