import * as ConfirmPopup from '../popups/confirm.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as overlay from '../overlay.js'
import * as preferences from '../../preferences.js'
import * as shared from '../../shared.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { useStyle } from '../style.js'

const unfavoriteTaskClassName = useStyle({
	' path': {
		fill: 'none',
		stroke: 'var(--color-theme-900)',
		strokeWidth: 2,
	},
})

class TimeInputHistoryStack {
	constructor(inputEl) {
		this._backwardsStack = []
		this._forwardsStack = []
		this._inputEl = inputEl
	}

	_get() {
		return {
			selectionIndex: this._inputEl.selectionStart,
			value: this._inputEl.value,
		}
	}

	_set({ selectionIndex, value }) {
		this._inputEl.value = value
		this._inputEl.selectionStart = this._inputEl.selectionEnd = selectionIndex
		this._inputEl.dispatchEvent(new Event('change'))
		// console.log(this._backwardsStack.map(i => i.value), value, this._forwardsStack.map(i => i.value).reverse())
	}

	popBackwards() {
		if (this._backwardsStack.length === 0) return
		this._forwardsStack.push(this._get())
		this._set(this._backwardsStack.pop())
	}

	popForwards() {
		if (this._forwardsStack.length === 0) return
		this._backwardsStack.push(this._get())
		this._set(this._forwardsStack.pop())
	}

	push(value, selectionIndex) {
		this._forwardsStack.length = 0
		this._backwardsStack.push(this._get())
		this._set({ selectionIndex, value })
	}
}


async function createOrUpdateTimer(projectId, taskId, updates) {
	const timer = await db.getTimer(projectId, taskId)
	if (timer) {
		await db.updateTimer({ ...timer, ...updates })
		return
	}
	await db.createTimer({
		duration: 0,
		projectId: projectId,
		running: false,
		started_at: Date.now(),
		taskId: taskId,
		...updates,
	})
}

export function hide() {
	overlay.hide('timer')
}

export async function show({ projectId, taskId, dialogOptions }) {
	const overlayOptions = dialogOptions?.overlayOptions

	let timeElUndoRedoStateMachine

	const timeEl = El('input', {
		style: {
			boxSizing: 'border-box',
			height: '32px !important',
			paddingTop: '8px !important',
			paddingRight: '8px !important',
			width: (shared.formatDuration(0).length === 5 ? 53 : 72) + 'px !important',
		},
		type: 'text',
		value: shared.formatDuration(0),
		async onChange() {
			try {
				await createOrUpdateTimer(projectId, taskId, {
					duration: shared.parseTime(this.value),
					started_at: Date.now(),
				})
			}
			catch (e) {
				const timer = await db.getTimer(projectId, taskId)
				this.value = shared.formatDuration(timer ? shared.getTimerDuration(timer) : 0)
			}
		},
		async onKeyDown(e) {
			if (e.ctrlKey) {
				if (e.key === 'c') {
					navigator.clipboard.writeText(this.value)
					return
				}
				if (e.key === 'v') {
					this.selectionStart = 0
					this.selectionEnd = this.value.length
					setTimeout(() => this.dispatchEvent(new Event('change')), 10)
					return
				}
				if (e.key === 'z') {
					timeElUndoRedoStateMachine.popBackwards()
					return
				}
				if (e.key === 'Z') {
					timeElUndoRedoStateMachine.popForwards()
					return
				}
			}
			if (e.key === 'ArrowLeft') return
			if (e.key === 'ArrowRight') return
			if (e.key === 'Tab') return

			e.preventDefault()

			if (e.key === 'Backspace') {
				let start = this.selectionStart
				let { value } = this
				if (value[start - 1] === ':') start--
				if (start <= 0) return
				value = value.slice(0, start - 1) + '0' + value.slice(start)
				timeElUndoRedoStateMachine.push(value, start - 1)
				return
			}

			let digit = parseInt(e.key)
			if (isNaN(digit)) {
				return
			}

			let start = this.selectionStart
			if (start === this.value.length) {
				start--
			}

			let { value } = this
			if (value[start] === ':') {
				start++
			}

			if (value[start - 1] === ':') {
				digit = Math.min(5, digit)
			}

			value = value.slice(0, start) + digit + value.slice(start + 1)
			start = start + 1 + (value[start + 1] === ':' ? 1 : 0)
			timeElUndoRedoStateMachine.push(value, start)
		},
	})
	timeElUndoRedoStateMachine = new TimeInputHistoryStack(timeEl)

	const descriptionEl = El('textarea', {
		style: { padding: 8, resize: 'vertical', transition: 'none', width: '100%' },
		async onChange() {
			await createOrUpdateTimer(projectId, taskId, {
				description: this.value,
			})
		},
	})

	const isBillableEl = El('input', {
		checked: false,
		disabled: true,
		type: 'checkbox',
		async onChange() {
			await createOrUpdateTimer(projectId, taskId, {
				isBillable: this.checked,
			})
		},
	})

	const followTaskIsBillableEl = El('a', {
		href: '#',
		style: {
			marginLeft: 4,
			position: 'relative',
			top: -2,
			$: { display: 'none' },
		},
		async onClick() {
			const timer = await db.getTimer(projectId, taskId)
			delete timer.isBillable
			await db.updateTimer(timer)
			isBillableEl.disabled = true
			const res = await cache.getTask({ projectId, taskId })
			isBillableEl.checked = res.single.is_billable
			isBillableEl.disabled = false
		},
	}, 'Follow Task')

	const jobTypeEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content'
		},
		value: await preferences.getTimersDefaultJobType(),
		async onChange() {
			await createOrUpdateTimer(projectId, taskId, {
				jobTypeId: parseInt(this.value),
			})
		},
	}, angie.collections.job_types.map(({ id, name }) => {
		return El('option', { value: id }, name)
	}))

	const bodyEl = DialogBody({}, El('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
		El('div', { style: { display: 'flex', gap: 36 } }, [
			El('div', [
				El('h2', 'Time'),
				timeEl,
			]),
			El('div', [
				El('h2', 'Job Type'),
				jobTypeEl,
			]),
			El('div', [
				El('h2', 'Billable'),
				isBillableEl,
				followTaskIsBillableEl,
			]),
		]),
		El('div', [
			El('h2', 'Description'),
			descriptionEl,
		]),
	]))

	let unsub

	async function onClickDelete() {
		const yes = await ConfirmPopup.show({
			message: 'Delete Timer?',
			target: deleteButtonEl.firstChild,
		})
		if (!yes) return
		await db.deleteTimer(projectId, taskId)
		hide()
	}

	async function onClickFavorite() {
		const favoriteTask = await db.getFavoriteTask(projectId, taskId)
		if (favoriteTask) {
			await db.deleteFavoriteTask(projectId, taskId)
		}
		else {
			await db.createFavoriteTask({ projectId, taskId })
		}
	}

	async function onClickSubmit() {
		await shared.submitTimer({ projectId, taskId })
		hide()
	}

	async function update(stillUpdateTimeIfRunning) {
		const favoriteTask = await db.getFavoriteTask(projectId, taskId)
		favoritedButtonEl.classList.toggle(unfavoriteTaskClassName, !Boolean(favoriteTask))

		const timer = await db.getTimer(projectId, taskId)

		submitButtonEl.style.display = timer ? '' : 'none'
		deleteButtonEl.style.display = timer ? '' : 'none'

		if (!timer) return

		if (!timer.running || stillUpdateTimeIfRunning) {
			timeEl.value = shared.formatDuration(shared.getTimerDuration(timer))
		}

		if (typeof timer.description === 'string') {
			descriptionEl.value = timer.description
		}

		if (typeof timer.isBillable === 'boolean') {
			isBillableEl.checked = timer.isBillable
			followTaskIsBillableEl.style.display = ''
		}
		else {
			followTaskIsBillableEl.style.display = 'none'
		}

		if (typeof timer.jobTypeId === 'number') {
			jobTypeEl.value = timer.jobTypeId
		}

		return timer
	}

	async function onConnected(el) {
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'favorite-task-created':
				case 'favorite-task-deleted':
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
				case 'timers-deleted':
					if (data.projectId !== projectId) break
					if (data.taskId !== taskId) break
					update()
					break
			}
		})
		const timer = update(true)

		descriptionEl.focus()

		if (timer && typeof timer.isBillable !== 'boolean') {
			const res = await cache.getTask({ projectId, taskId })
			isBillableEl.checked = res.single.is_billable
		}
		isBillableEl.disabled = false
	}

	function onDisconnected() {
		unsub()
	}

	const deleteButtonEl = DialogHeaderButton({
		icon: angie.icons.main_menu_icon_trash,
		iconStyleExtra: { scale: 1.2 },
		title: 'Delete',
		onClick: onClickDelete,
	})

	const favoritedButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_star,
		iconStyleExtra: { scale: 1.1 },
		title: 'Favorite',
		onClick: onClickFavorite,
	})

	const submitButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_icon_submit_time,
		iconStyleExtra: { scale: 1.3 },
		title: 'Submit',
		onClick: onClickSubmit,
	})

	const name = await cache.getTaskName({ projectId, taskId })

	const dialogEl = Dialog({ onConnected, onDisconnected, width: 550, ...dialogOptions }, [
		DialogHeader(name, [
			favoritedButtonEl,
			submitButtonEl,
			deleteButtonEl,
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		bodyEl,
	])
	overlay.show('timer', overlayOptions, dialogEl)
}
