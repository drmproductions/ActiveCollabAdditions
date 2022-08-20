import * as log from './log.js'

const interceptors = []

function getAuthFields() {
	return {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-Angie-CsrfValidator': window.getCsrfCookie(),
		},
	}
}

export async function deleteProjectMember({ projectId, memberId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/members/${memberId}`, {
		...getAuthFields(),
		method: 'DELETE',
	})
	return await res.json()
}

export async function getMyTasks() {
	const userId = angie.user_session_data.logged_user_id
	const res = await fetch(`${angie.api_url}/users/${userId}/tasks`)
	return await res.json()
}

export async function getProject({ projectId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}`)
	return await res.json()
}

export async function getProjects() {
	const res = await fetch(`${angie.api_url}/projects`)
	return await res.json()
}

export async function getTask({ projectId, taskId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/tasks/${taskId}`)
	return await res.json()
}

export async function getTasks({ projectId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/tasks`)
	return await res.json()
}

export function init() {
	window.fetch = new Proxy(window.fetch, {
		async apply(target, self, args) {
			const [resource, options, ...rest] = args

			const performFuncs = []

			if (resource) {
				try {
					const url = new URL(resource)
					const method = (options?.method ?? 'get').toLowerCase()
					const onPerform = (func) => performFuncs.push(func)
					for (const { handler, regex } of interceptors) {
						const matches = url.pathname.match(regex)
						if (!matches) continue
						await handler({ url, matches, method, options, onPerform })
					}
				}
				catch (e) {
					log.e('api', e)
				}
			}

			const res = await target.call(self, resource, options, ...rest)

			if (performFuncs.length > 0) {
				const value = await(res.clone()).json()
				try {
					for (const resolve of performFuncs) {
						await resolve(value)
					}
				}
				catch (e) {
					log.e('api', e)
				}
			}

			return res
		},
	})
}

export function intercept(regex, handler) {
	interceptors.push({ regex, handler })
}

export async function postProjectMember({ projectId, memberId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/members`, {
		...getAuthFields(),
		method: 'POST',
		body: JSON.stringify([memberId]),
	})
	return await res.json()
}

export async function postTimeRecord(payload) {
	const res = await fetch(`${angie.api_url}/projects/${payload.project_id}/time-records`, {
		...getAuthFields(),
		method: 'POST',
		body: JSON.stringify(payload),
	})
	return await res.json()
}

export async function putTask({ projectId, taskId }, payload) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/tasks/${taskId}`, {
		...getAuthFields(),
		method: 'PUT',
		body: JSON.stringify(payload),
	})
	return await res.json()
}
