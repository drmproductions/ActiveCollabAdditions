import * as api from './api.js'

const cacheLockFuncsMap = new Map()
const cacheMap = new Map()

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

function set(key, value) {
	cacheMap.set(key, value)
}

export function setTaskName({ projectId, taskId, name }) {
	set(`task-name-${projectId}-${taskId}`, name)
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
				console.log('failed to resolve cache lock function')
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
				console.log('failed to reject cache lock function')
			}
		}
		throw e
	}
	finally {
		cacheLockFuncsMap.delete(key)
	}
}
