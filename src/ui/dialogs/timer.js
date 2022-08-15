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
	constructor(el) {
		this._backwardsStack = []
		this._el = el
		this._forwardsStack = []
	}

	get() {
		const selection = document.getSelection()
		const value = this._el.innerText
		// fix for firefox weirdness when all the text is selected
		// SEE https://bugzilla.mozilla.org/show_bug.cgi?id=688379
		// SEE https://bugzilla.mozilla.org/show_bug.cgi?id=569190
		if (selection.anchorNode === this._el) {
			return { end: value.length, start: 0, value }
		}
		const range = document.getSelection().getRangeAt(0).cloneRange()
		const end = Math.max(range.startOffset, range.endOffset)
		const start = Math.min(range.startOffset, range.endOffset)
		return { end, start, value }
	}

	paste() {
		const { value } = this.get()

		const range = document.createRange()
		range.setStart(this._el.firstChild, 0)
		range.setEnd(this._el.firstChild, value.length)

		const selection = document.getSelection()
		selection.removeAllRanges()
		selection.addRange(range)

		setTimeout(() => this._el.onchange(), 10)
	}

	popBackwards() {
		if (this._backwardsStack.length === 0) return
		this._forwardsStack.push(this.get())
		this.set(this._backwardsStack.pop())
	}

	popForwards() {
		if (this._forwardsStack.length === 0) return
		this._backwardsStack.push(this.get())
		this.set(this._forwardsStack.pop())
	}

	push(value, start, end) {
		this._forwardsStack.length = 0
		this._backwardsStack.push(this.get())
		this.set({ end, start, value })
	}

	set({ end, start, value }) {
		const changed = this._el.innerText !== value

		if (changed) {
			this._el.innerText = value
		}

		const range = document.createRange()
		range.setStart(this._el.firstChild, start)
		range.setEnd(this._el.firstChild, end)

		const selection = document.getSelection()
		if (this._el.contains(selection.anchorNode)) {
			selection.removeAllRanges()
			selection.addRange(range)
		}

		if (changed) {
			this._el.onchange()
		}
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

	let timeInputHistoryStack

	const timeEl = El('div', {
		contentEditable: true,
		style: {
			border: '1px solid var(--border-primary)',
			borderRadius: 10,
			boxSizing: 'border-box',
			color: 'var(--color-theme-900)',
			fontSize: 14,
			height: '32px !important',
			padding: '4px 10px 6px 8px',
			paddingRight: '8px !important',
			paddingTop: '8px !important',
			textAlign: 'center',
			transition: 'all .3s ease',
			width: 'fit-content',
			':hover': {
				borderColor: 'var(--color-primary)',
				outline: 'none',
			},
			':focus': {
				borderColor: 'var(--color-primary)',
				outline: 'none',
			},
		},
		async onChange() {
			const state = timeInputHistoryStack.get()
			try {
				await createOrUpdateTimer(projectId, taskId, {
					duration: shared.parseTime(state.value),
					started_at: Date.now(),
				})
			}
			catch (e) {
				const timer = await db.getTimer(projectId, taskId)
				const value = shared.formatDuration(timer ? shared.getTimerDuration(timer) : 0)
				timeInputHistoryStack.set({ ...state, value })
			}
		},
		async onKeyDown(e) {
			let { start, end, value } = timeInputHistoryStack.get()

			if (e.ctrlKey) {
				if (e.key === 'a') {
					return
				}
				if (e.key === 'c') {
					navigator.clipboard.writeText(start === end ? value : value.slice(start, end))
					return
				}
				if (e.key === 'v') {
					timeInputHistoryStack.paste()
					return
				}
				if (e.key === 'z') {
					timeInputHistoryStack.popBackwards()
					return
				}
				if (e.key === 'Z') {
					timeInputHistoryStack.popForwards()
					return
				}
			}
			if (e.key === 'ArrowLeft') return
			if (e.key === 'ArrowRight') return
			if (e.key === 'Tab') return

			e.preventDefault()

			if (e.key === 'Backspace') {
				if (start !== end) {
					const chars = []
					for (let i = 0; i < value.length; i++) {
						const char = value[i]
						if (char !== ':' && i >= start && i < end) {
							chars.push('0')
						}
						else {
							chars.push(char)
						}
					}
					value = chars.join('')
					timeInputHistoryStack.push(value, start, end)
					return
				}
				if (value[start - 1] === ':') start--
				if (start <= 0) return
				value = value.slice(0, start - 1) + '0' + value.slice(start)
				timeInputHistoryStack.push(value, start - 1, start - 1)
				return
			}

			let digit = parseInt(e.key)
			if (isNaN(digit)) {
				return
			}

			if (start === value.length) {
				start--
			}

			if (value[start] === ':') {
				start++
			}

			if (value[start - 1] === ':') {
				digit = Math.min(5, digit)
			}

			value = value.slice(0, start) + digit + value.slice(start + 1)
			start = start + 1 + (value[start + 1] === ':' ? 1 : 0)
			timeInputHistoryStack.push(value, start, start)
		},
	}, shared.formatDuration(0))
	timeInputHistoryStack = new TimeInputHistoryStack(timeEl)

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
			isBillableEl.checked = res.is_billable
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

	async function onClickClear() {
		const yes = await ConfirmPopup.show({
			message: 'Clear Timer?',
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
		const isFavorite = Boolean(favoriteTask)
		favoritedButtonEl.classList.toggle(unfavoriteTaskClassName, !isFavorite)
		favoritedButtonEl.title = isFavorite ? 'Unfavorite' : 'Favorite'

		const timer = await db.getTimer(projectId, taskId)

		const isSubmittable = timer && shared.isTimerSubmittable(timer)
		submitButtonEl.style.display = isSubmittable ? '' : 'none'
		deleteButtonEl.style.display = isSubmittable ? '' : 'none'

		if (!timer) return

		if (!timer.running || stillUpdateTimeIfRunning) {
			const state = timeInputHistoryStack.get()
			const value = shared.formatDuration(shared.getTimerDuration(timer))
			timeInputHistoryStack.set({ ...state, value })
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
			isBillableEl.checked = res.is_billable
		}
		isBillableEl.disabled = false
	}

	function onDisconnected() {
		unsub()
	}

	const deleteButtonEl = DialogHeaderButton({
		icon: angie.icons.main_menu_icon_trash,
		iconStyle: { scale: 1.2 },
		title: 'Clear...',
		onClick: onClickClear,
	})

	const favoritedButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_star,
		iconStyle: { scale: 1.1 },
		title: 'Favorite',
		onClick: onClickFavorite,
	})

	const submitButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_icon_submit_time,
		iconStyle: { scale: 1.3 },
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
				iconStyle: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		bodyEl,
	])
	overlay.show('timer', overlayOptions, dialogEl)
}
