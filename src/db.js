import * as bus from './bus.js'

let db

export function close() {
	db.close()
	db = undefined
}

export function createTimer(timer) {
	const { project, task } = timer
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-created', { data: { project, task } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.add(timer)
	})
}

export function deleteTimer(project, task) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-deleted', { data: { project, task } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.delete([project, task])
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

export function getTimer(project, task) {
	return new Promise((resolve, reject) => {
		let result

		const transaction = db.transaction('timers', 'readonly')
		transaction.oncomplete = () => resolve(result)
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.get([project, task]).onsuccess = (event) => {
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
		const request = window.indexedDB.open('active-collab-inline-timers', 1)
		request.onerror = (event) => {
			reject(event)
		}
		request.onupgradeneeded = ({ target: { result } }) => {
			result.createObjectStore('timers', { keyPath: ['project', 'task'] })
		}
		request.onsuccess = ({ target: { result } }) => {
			db = result
			resolve()
		}
	})
}

export function updateTimer(timer) {
	const { project, task } = timer
	return new Promise((resolve, reject) => {
		const transaction = db.transaction('timers', 'readwrite')
		transaction.oncomplete = () => {
			bus.emit('timer-updated', { data: { project, task } })
			resolve()
		}
		transaction.onerror = reject

		const objectStore = transaction.objectStore('timers')
		objectStore.put(timer)
	})
}
