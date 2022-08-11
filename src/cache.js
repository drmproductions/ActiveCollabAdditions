import * as api from './api.js'
import * as db from './db.js'
import * as log from './log.js'
import * as utils from './utils.js'

const cacheLockFuncsMap = new Map()
const cacheMap = new Map()

export async function getProject({ projectId }) {
	return await useCache(`project-${projectId}`, async () => {
		const res = await api.getProject({ projectId })
		return res.single
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
		return res.single
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

export async function preload() {
	const start = performance.now()

	const promises = []

	// preload my tasks

	promises.push(utils.call(async () => {
		let count = 0

		const { tasks } = await api.getMyTasks()
		for (const task of tasks) {
			const projectId = task.project_id
			const taskId = task.id
			if (!hasTask({ projectId, taskId }))
				count++
			setTask({ projectId, taskId }, task)
		}

		if (count > 0) {
			log.i('cache', `preloaded ${count} of my tasks`)
		}
	}))

	// preload my projects and all tasks for projects with timers started

	promises.push(utils.call(async () => {
		let count = 0
		const promises = []
		const projectIdSet = new Set()

		for (const { projectId } of await db.getFavoriteTasks()) {
			projectIdSet.add(projectId)
		}

		for (const { projectId } of await db.getTimers()) {
			projectIdSet.add(projectId)
		}

		const projects = await api.getProjects()
		for (const project of projects) {
			const projectId = project.id
			if (!hasProject({ projectId }))
				count++
			setProject({ projectId }, project)
			if (projectIdSet.has(projectId)) {
				promises.push(preloadTasks({ projectId }))
			}
		}

		if (count > 0) {
			log.i('cache', `preloaded ${count} projects`)
		}

		await Promise.all(promises)
	}))

	await Promise.all(promises)

	log.i('cache', `preload completed in ${Math.floor(performance.now() - start)} ms`)
}

// TODO tapping a timer in a project should call this and just preload all tasks for that project
export async function preloadTasks({ projectId }) {
	await useCache(`tasks-${projectId}`, async () => {
		let count = 0
		const { tasks } = await api.getTasks({ projectId })
		for (const task of tasks) {
			const taskId = task.id
			if (!hasTask({ projectId, taskId }))
				count++
			setTask({ projectId, taskId }, task)
		}
		if (count > 0) {
			log.i('cache', `preloaded ${count} tasks for project ${projectId}`)
		}
	})
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
