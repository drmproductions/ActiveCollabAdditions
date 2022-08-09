import * as bus from './bus.js'

let db

export function close() {
	db.close()
	db = undefined
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

export function getSetting(key) {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('settings', 'readonly')
		transaction.oncomplete = () => resolve(result?.value)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('settings')
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

export function open() {
	return new Promise((resolve, reject) => {
		const request = window.indexedDB.open('active-collab-inline-timers', 2)
		request.onerror = (event) => {
			reject(event)
		}
		request.onupgradeneeded = ({ oldVersion, newVersion, target: { result } }) => {
			const check = (version) => version > oldVersion && version <= newVersion

			if (check(1)) {
				result.createObjectStore('timers', { keyPath: ['projectId', 'taskId'] })
			}

			if (check(2)) {
				result.createObjectStore('settings', { keyPath: 'key' })
			}
		}
		request.onsuccess = ({ target: { result } }) => {
			db = result
			resolve()
		}
	})
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

export function setSetting(key, value) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('settings', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('setting-updated', { data: { key } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('settings')
		objectStore.put({ key, value })
	})
}
