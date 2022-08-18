import * as api from './api.js'
import * as db from './db.js'
import * as cache from './cache.js'
import * as log from './log.js'
import * as shared from './shared.js'
import * as utils from './utils.js'

async function maybePreloadForMyTasksPage(url) {
	if (!url.pathname.endsWith('/my-work')) return

	await cache.useCache('my-tasks', async () => {
		log.i('cacher', `preloading my tasks`)

		let count = 0

		const { tasks } = await api.getMyTasks()
		for (const task of tasks) {
			const projectId = task.project_id
			const taskId = task.id
			if (!cache.hasTask({ projectId, taskId }))
				count++
			cache.setTask({ projectId, taskId }, task)
		}

		if (count > 0) {
			log.i('cacher', `preloaded ${count} of my tasks`)
		}
	})
}

async function maybePreloadForProjectPage(url) {
	const ids = shared.getProjectIdFromUrl(url)
	if (!ids) return
	const { projectId } = ids

	await cache.useCache(`project-page-${projectId}`, async () => {
		log.i('cacher', `preloading project ${projectId} and its tasks for project page`)
		await Promise.all([
			cache.getProject({ projectId }),
			preloadTasks({ projectId }),
		])
		log.i('cacher', `preloaded project ${projectId} and its tasks for project page`)
	})
}

export async function init() {
	// TODO maybe proxy window.fetch and cache returned projects and tasks

	// automatically load projects and tasks as the user navigates the app
	const windowHistoryPushStateRevocableProxy = Proxy.revocable(window.history.pushState, {
		apply: (target, self, args) => {
			const [,, href] = args
			if (href) {
				const url = new URL(href)
				try { maybePreloadForProjectPage(url) } catch {}
				try { maybePreloadForMyTasksPage(url) } catch {}
			}
			return target.apply(self, args)
		},
	})
	window.history.pushState = windowHistoryPushStateRevocableProxy.proxy

	const start = performance.now()

	// NOTE the following are higher priority so we wait for them

	// preload the project and tasks for the project page we're currently on
	await maybePreloadForProjectPage(document.location)

	// preload my tasks
	await maybePreloadForMyTasksPage(document.location)

	// preload projects & tasks we have timers started in

	await utils.call(async () => {
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

			if (!cache.hasProject({ projectId }))
				count++
			cache.setProject({ projectId }, project)

			if (!project.is_tracking_enabled) continue

			if (projectIdSet.has(projectId)) {
				promises.push(preloadTasks({ projectId }))
			}
		}

		if (count > 0) {
			log.i('cacher', `preloaded ${count} projects`)
		}

		await Promise.all(promises)
	})

	log.i('cacher', `preload completed in ${Math.floor(performance.now() - start)} ms`)

	return () => {
		windowHistoryPushStateRevocableProxy.revoke()
	}
}

export async function preloadTasks({ projectId }) {
	await cache.useCache(`tasks-${projectId}`, async () => {
		let count = 0
		const { tasks } = await api.getTasks({ projectId })
		for (const task of tasks) {
			const taskId = task.id
			if (!cache.hasTask({ projectId, taskId }))
				count++
			cache.setTask({ projectId, taskId }, task)
		}
		if (count > 0) {
			log.i('cacher', `preloaded ${count} tasks for project ${projectId}`)
		}
	})
}
