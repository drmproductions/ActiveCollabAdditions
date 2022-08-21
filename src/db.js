import * as bus from './bus.js'

let db

export function createFavoriteTask(favoriteTask) {
	const { projectId, taskId } = favoriteTask
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('favoriteTasks', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('favorite-task-created', { data: { projectId, taskId } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('favoriteTasks')
		objectStore.add(favoriteTask)
	})
}

export function createTimer(timer) {
	const { projectId, taskId } = timer
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-created', { data: { projectId, taskId } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.add(timer)
	})
}

export function deleteFavoriteTask(projectId, taskId) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('favoriteTasks', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('favorite-task-deleted', { data: { projectId, taskId } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('favoriteTasks')
		objectStore.delete([projectId, taskId])
	})
}

export function deletePreference(key) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('preferences', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('preference-changed', { data: { key } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('preferences')
		objectStore.delete(key)
	})
}

export function deleteTimer(projectId, taskId) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-deleted', { data: { projectId, taskId } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.delete([projectId, taskId])
	})
}

export function deleteTimers() {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timers-deleted')
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.clear()
	})
}

export function getFavoriteTask(projectId, taskId) {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('favoriteTasks', 'readonly')
		transaction.oncomplete = () => resolve(result)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('favoriteTasks')
		objectStore.get([projectId, taskId]).onsuccess = (event) => {
			result = event.target.result
		}
	})
}

export function getFavoriteTasks() {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('favoriteTasks', 'readonly')
		transaction.oncomplete = () => resolve(result)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('favoriteTasks')
		objectStore.getAll().onsuccess = (event) => {
			result = event.target.result
		}
	})
}

export function getPreference(key) {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('preferences', 'readonly')
		transaction.oncomplete = () => resolve(result?.value)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('preferences')
		objectStore.get(key).onsuccess = (event) => {
			result = event.target.result
		}
	})
}

export function getTimer(projectId, taskId) {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('timers', 'readonly')
		transaction.oncomplete = () => resolve(result)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.get([projectId, taskId]).onsuccess = (event) => {
			result = event.target.result
		}
	})
}

export function getTimers() {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('timers', 'readonly')
		transaction.oncomplete = () => resolve(result)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.getAll().onsuccess = (event) => {
			result = event.target.result
		}
	})
}

export async function hasPreference(key) {
	const preference = await getPreference(key)
	if (preference === undefined) return false
	return true
}

export async function init() {
	await new Promise((resolve, reject) => {
		// TODO rename this before publishing to the store
		const request = window.indexedDB.open('active-collab-inline-timers', 3)
		request.onerror = (event) => {
			reject(event)
		}
		request.onupgradeneeded = ({ oldVersion, newVersion, target: { result } }) => {
			const check = (version) => version > oldVersion && version <= newVersion

			if (check(1)) {
				result.createObjectStore('timers', { keyPath: ['projectId', 'taskId'] })
			}

			if (check(2)) {
				result.createObjectStore('preferences', { keyPath: 'key' })
			}

			if (check(3)) {
				result.createObjectStore('favoriteTasks', { keyPath: ['projectId', 'taskId'] })
			}
		}
		request.onsuccess = ({ target: { result } }) => {
			db = result
			resolve()
		}
	})
	return () => {
		db.close()
		db = undefined
	}
}

export function updateTimer(timer) {
	const { projectId, taskId } = timer
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-updated', { data: { projectId, taskId } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.put(timer)
	})
}

export function setPreference(key, value) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('preferences', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('preference-changed', { data: { key } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('preferences')
		objectStore.put({ key, value })
	})
}
