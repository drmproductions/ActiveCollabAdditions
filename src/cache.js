import * as api from './api.js'
import * as log from './log.js'

const cacheLockFuncsMap = new Map()
const cacheMap = new Map()

export async function getProject({ projectId }) {
	return await useCache(`project-${projectId}`, async () => {
		const res = await api.getProject({ projectId })
		const project = res.single
		setProjectName({ projectId }, project.name)
		return project
	})
}

export async function getProjectName({ projectId }) {
	return await useCache(`project-name-${projectId}`, async () => {
		const project = await getProject({ projectId })
		return project.name
	})
}

export async function getTask({ projectId, taskId }) {
	return await useCache(`task-${projectId}-${taskId}`, async () => {
		const res = await api.getTask({ projectId, taskId })
		const task = res.single
		setTaskName({ projectId, taskId }, task.name)
		return task
	})
}

export async function getTaskName({ projectId, taskId }) {
	return await useCache(`task-name-${projectId}-${taskId}`, async () => {
		const task = await getTask({ projectId, taskId })
		return task.name
	})
}

function has(key) {
	return cacheMap.has(key)
}

export function hasProject({ projectId }) {
	return has(`project-${projectId}`)
}

export function hasTask({ projectId, taskId }) {
	return has(`task-${projectId}-${taskId}`)
}

function set(key, value) {
	cacheMap.set(key, value)
}

export function setProject({ projectId }, value) {
	set(`project-${projectId}`, value)
}

export function setProjectName({ projectId }, value) {
	set(`project-name-${projectId}`, value)
}

export function setTask({ projectId, taskId }, value) {
	set(`task-${projectId}-${taskId}`, value)
}

export function setTaskName({ projectId, taskId }, value) {
	set(`task-name-${projectId}-${taskId}`, value)
}

export function updateProject({ projectId }, updates) {
	const project = cacheMap.get(`project-${projectId}`)
	if (!project) return
	Object.assign(project, updates)
}

export function updateTask({ projectId, taskId }, updates) {
	const task = cacheMap.get(`task-${projectId}-${taskId}`)
	if (!task) return
	Object.assign(task, updates)
}

export async function useCache(key, func) {
	if (cacheMap.has(key)) {
		return cacheMap.get(key)
	}

	if (cacheLockFuncsMap.has(key)) {
		const funcs = cacheLockFuncsMap.get(key)
		return new Promise((resolve, reject) => funcs.push({ resolve, reject }))
	}

	const funcs = []
	cacheLockFuncsMap.set(key, funcs)

	try {
		const value = await func()
		cacheMap.set(key, value)
		for (const { resolve } of funcs) {
			try {
				resolve(value)
			}
			catch (e) {
				log.e('cache', 'failed to resolve cache lock function')
			}
		}
		return value
	}
	catch (e) {
		for (const { reject } of funcs) {
			try {
				reject(e)
			}
			catch (e) {
				log.e('cache', 'failed to reject cache lock function')
			}
		}
		throw e
	}
	finally {
		cacheLockFuncsMap.delete(key)
	}
}
