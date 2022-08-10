export async function getProject({ projectId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}`)
	return await res.json()
}

export async function getTask({ projectId, taskId }) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/tasks/${taskId}`)
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
