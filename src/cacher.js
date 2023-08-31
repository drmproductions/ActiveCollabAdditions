import * as api from './api.js'
import * as cache from './cache.js'
import * as db from './db.js'
import * as log from './log.js'

api.intercept(/(projects\/)([0-9]*)$/, async ({ method, onPerform }) => {
	if (method !== 'get' && method !== 'put') return
	onPerform(async (value) => {
		const project = value.single
		cache.setProject({ projectId: project.id }, project)
	})
})

api.intercept(/(projects\/)([0-9]*)\/members(\/[0-9]*)?$/, async ({ matches, method, onPerform }) => {
	if (method !== 'delete' && method !== 'post') return
	onPerform(async (value) => {
		const projectId = parseInt(matches[2])
		if (!cache.hasProject({ projectId })) return
		const project = await cache.getProject({ projectId })
		project.members.length = 0
		for (const member of value) {
			project.members.push(member)
		}
	})
})

api.intercept(/projects\/for-screen$/, async ({ method, onPerform }) => {
	if (method !== 'get' && method !== 'put') return
	onPerform(async (value) => {
		if (!Array.isArray(value)) return
		for (const project of value) {
			cache.updateProject({ projectId: project.id }, project)
		}
	})
})

api.intercept(/(projects\/)([0-9]*)\/tasks\/for-screen$/, async ({ method, onPerform }) => {
	if (method !== 'get') return
	onPerform(async (value) => {
		if (!Array.isArray(value)) return
		for (const task of value) {
			cache.updateTask({ projectId: task.project_id, taskId: task.id }, task)
		}
	})
})

api.intercept(/(projects\/)([0-9]*)(\/)(tasks\/)([0-9]*)$/, async ({ method, onPerform }) => {
	if (method !== 'get' && method !== 'put') return
	onPerform(async (value) => {
		const task = value.single
		cache.setTask({ projectId: task.project_id, taskId: task.id }, task)
	})
})

api.intercept(/(projects\/)([0-9]*)(\/)(tasks)$/, async ({ method, onPerform }) => {
	if (method !== 'get' && method !== 'put') return
	onPerform(async (value) => {
		if (!Array.isArray(value.tasks)) return
		for (const task of value.tasks) {
			cache.setTask({ projectId: task.project_id, taskId: task.id }, task)
		}
	})
})

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

export async function preloadProjectTasks({ projectId }) {
	await cache.useCache(`project-tasks-${projectId}`, async () => {
		log.i('cacher', `preloading project ${projectId} tasks`)
		await api.getTasks({ projectId })
	})
}
