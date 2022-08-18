import * as api from './api.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as log from './log.js'

function cacheProject(value) {
	const project = value.single
	cache.setProject({ projectId: project.id }, project)
}

function cacheProjectsForScreen(value) {
	if (!Array.isArray(value)) return
	for (const project of value) {
		cache.setProject({ projectId: project.id }, project)
	}
}

function cacheTask(value) {
	const task = value.single
	cache.setTask({ projectId: task.project_id, taskId: task.id }, task)
}

function cacheTasks(value) {
	if (!Array.isArray(value)) return
	for (const task of value) {
		cache.setTask({ projectId: task.project_id, taskId: task.id }, task)
	}
}

function getCacherSetter(pathname, { isGet, isPut }) {
	if (pathname.match(/(projects\/)([0-9]*)$/)) {
		return (isGet || isPut) && cacheProject
	}

	if (pathname.match(/projects\/for-screen$/)) {
		return isGet && cacheProjectsForScreen
	}

	if (pathname.match(/(projects\/)([0-9]*)\/tasks\/for-screen$/)) {
		return isGet && cacheTasks
	}

	if (pathname.match(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)$/)) {
		return (isGet || isPut) && cacheTask
	}

	if (pathname.match(/(projects\/)([0-9]*)(\/)(tasks)$/)) {
		return isGet && cacheTasks
	}
}

async function maybeCacheResponse(url, method, promise) {
	// log.i('cacher', method, url.pathname)
	const func = getCacherSetter(url.pathname, {
		isGet: method === 'get',
		isPut: method === 'put',
	})
	if (!func) return
	try {
		const res = await promise
		const value = await (res.clone()).json()
		func(value)
	}
	catch (e) {
		log.e(e)
	}
}

export async function earlyInit() {
	const windowFetchRevocableProxy = Proxy.revocable(window.fetch, {
		apply: async (target, self, args) => {
			const [resource, options] = args
			const promise = target.apply(self, args)

			if (resource) {
				try {
					const url = new URL(resource)
					const method = (options?.method ?? 'get').toLowerCase()
					await maybeCacheResponse(url, method, promise)
				}
				catch (e) {
					log.e(e)
				}
			}

			return await promise
		},
	})
	window.fetch = windowFetchRevocableProxy.proxy

	return () => {
		windowFetchRevocableProxy.revoke()
	}
}

export async function init() {
	const start = performance.now()

	// preload projects & tasks we have timers started in

	const projectIdSet = new Set()
	for (const { projectId } of await db.getFavoriteTasks()) {
		projectIdSet.add(projectId)
	}
	for (const { projectId } of await db.getTimers()) {
		projectIdSet.add(projectId)
	}

	const promises = []
	for (const projectId of projectIdSet.values()) {
		log.i('cacher', `loading ${projectId}`)
		// save time by loading all the projects the user is part of
		if (!cache.hasProject({ projectId })) {
			await preloadProjects()
		}
		const project = await cache.getProject({ projectId })
		if (!project.is_tracking_enabled) continue
		promises.push(preloadProjectTasks({ projectId }))
	}
	await Promise.all(promises)

	log.i('cacher', `preload completed in ${Math.floor(performance.now() - start)} ms`)
}

async function preloadProjects() {
	await cache.useCache('projects', async () => {
		log.i('cacher', 'preloading projects')
		await api.getProjects()
	})
}

async function preloadProjectTasks({ projectId }) {
	await cache.useCache(`project-tasks-${projectId}`, async () => {
		log.i('cacher', `preloading project ${projectId} tasks`)
		await api.getTasks({ projectId })
	})
}
