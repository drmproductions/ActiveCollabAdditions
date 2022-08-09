export async function fetchProject(projectId) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}`)
	return await res.json()
}

export async function fetchTask(projectId, taskId) {
	const res = await fetch(`${angie.api_url}/projects/${projectId}/tasks/${taskId}`)
	return await res.json()
}
