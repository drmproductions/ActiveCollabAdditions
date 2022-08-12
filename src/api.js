export async function deleteProjectMember({ projectId, memberId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/members/${memberId}`, {
		method: 'DELETE',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-Angie-CsrfValidator': window.getCsrfCookie(),
		},
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

export async function getProjectMembers({ projectId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/members`)
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

export async function postProjectMember({ projectId, memberId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/members`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-Angie-CsrfValidator': window.getCsrfCookie(),
		},
		body: JSON.stringify([memberId]),
	})
	return await res.json()
}

export async function postTimeRecord(payload) {
	const res = await fetch(`${angie.api_url}/projects/${payload.project_id}/time-records`, {
		method: 'POST',
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			'X-Angie-CsrfValidator': window.getCsrfCookie(),
		},
		body: JSON.stringify(payload),
	})
	return await res.json()
}
