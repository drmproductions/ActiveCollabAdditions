import * as ConfirmPopup from '../popups/confirm.js'
import * as api from '../../api.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as overlay from '../overlay.js'
import * as shared from '../../shared.js'
import * as utils from '../../utils.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { TimeInput, TimeInputHistoryStack } from '../TimeInput.js'
import { useStyle } from '../style.js'

const favoriteTaskClassName = useStyle({
	' path': {
		stroke: 'var(--color-theme-900)',
		strokeWidth: 2,
	},
})

const unfavoriteTaskClassName = useStyle({
	' path': {
		fill: 'none',
	},
})

async function createOrUpdateTimer(projectId, taskId, updates) {
	let timer = await db.getTimer(projectId, taskId)
	if (timer) {
		timer = { ...timer, ...updates }
		if (await shared.isTimerInDefaultState(timer)) {
			await db.deleteTimer(projectId, taskId)
			return
		}
		await db.updateTimer(timer)
		return
	}
	timer = {
		duration: 0,
		projectId: projectId,
		running: false,
		started_at: Date.now(),
		taskId: taskId,
		...updates,
	}
	if (await shared.isTimerInDefaultState(timer)) {
		return
	}
	await db.createTimer(timer)
}

export function hide() {
	overlay.hide('timer')
}

export async function show({ projectId, taskId, dialogOptions }) {
	const overlayOptions = dialogOptions?.overlayOptions

	const timeInputHistoryStack = new TimeInputHistoryStack()
	const timeInputEl = TimeInput({
		timeInputHistoryStack,
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
		async onFocus() {
			const timer = await db.getTimer(projectId, taskId)
			if (timer && timer.running) {
				timer.duration += Date.now() - timer.started_at
				timer.started_at = Date.now()
				timer.running = false
				await db.updateTimer(timer)
			}
		},
	})

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
			if (await shared.getUserCanChangeIsBillable({ projectId })) {
				await api.putTask({ projectId, taskId }, { is_billable: this.checked })
				return
			}
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

			if (await shared.isTimerInDefaultState(timer)) {
				await db.deleteTimer(projectId, taskId)
			}
			else {
				await db.updateTimer(timer)
			}
		},
	}, 'Follow Task')

	const jobTypeEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content'
		},
		async onChange() {
			await api.putTask({ projectId, taskId }, { job_type_id: parseInt(this.value) })
		},
	}, angie.collections.job_types.map(({ id, name }) => {
		return El('option', { value: id }, name)
	}))

	const bodyEl = DialogBody({}, El('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, [
		El('div', { style: { display: 'flex', gap: utils.isMobile() ? 18 : 36 } }, [
			El('div', { style: { flexShrink: 0 } }, [
				El('h2', 'Time'),
				timeInputEl,
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

	async function update(forceUpdateTimeEl) {
		const favoriteTask = await db.getFavoriteTask(projectId, taskId)
		const isFavorite = Boolean(favoriteTask)
		favoritedButtonEl.classList.toggle(unfavoriteTaskClassName, !isFavorite)
		favoritedButtonEl.title = isFavorite ? 'Unfavorite' : 'Favorite'

		const timer = await db.getTimer(projectId, taskId)

		const isSubmittable = timer && shared.isTimerSubmittable(timer)
		submitButtonEl.style.display = isSubmittable ? '' : 'none'
		deleteButtonEl.style.display = isSubmittable ? '' : 'none'

		if (forceUpdateTimeEl || !timer || !timer.running) {
			const state = timeInputHistoryStack.get()
			const value = shared.formatDuration(shared.getTimerDuration(timer))
			timeInputHistoryStack.set({ ...state, value })
		}

		{
			const value = (timer && typeof timer.description === 'string') ? timer.description : ''
			if (value !== descriptionEl.value) {
				descriptionEl.value = value
			}
		}

		const task = await cache.getTask({ projectId, taskId })

		if (await shared.getUserCanChangeIsBillable({ projectId })) {
			if (followTaskIsBillableEl.style.display !== 'none') {
				followTaskIsBillableEl.style.display = 'none'
			}
			if (isBillableEl.disabled) {
				isBillableEl.disabled = false
			}
			if (isBillableEl.checked !== task.is_billable) {
				isBillableEl.checked = task.is_billable
			}
		}
		else {
			let value
			let followTaskStyleDisplay
			if (timer && typeof timer.isBillable === 'boolean') {
				followTaskStyleDisplay = ''
				value = timer.isBillable
			}
			else {
				followTaskStyleDisplay = 'none'
				value = task.is_billable
			}

			if (followTaskStyleDisplay !== followTaskIsBillableEl.style.display) {
				followTaskIsBillableEl.style.display = followTaskStyleDisplay
			}

			if (value !== isBillableEl.checked) {
				isBillableEl.checked = value
			}

			if (isBillableEl.disabled) {
				isBillableEl.disabled = false
			}
		}

		{
			const jobTypeId = await shared.getTaskJobType(task)
			if (jobTypeEl.value !== jobTypeId) {
				jobTypeEl.value = jobTypeId
			}
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
					if (data.projectId !== projectId) break
					if (data.taskId !== taskId) break
					update()
				case 'timers-deleted':
					update()
					break
			}
		})
		update(true)
		descriptionEl.focus()
	}

	function onDisconnected() {
		unsub()
	}

	const deleteButtonEl = DialogHeaderButton({
		icon: angie.icons.main_menu_icon_trash,
		iconStyle: { scale: 1.25 },
		title: 'Clear...',
		onClick: onClickClear,
	})

	const favoritedButtonEl = DialogHeaderButton({
		icon: angie.icons.svg_icons_star,
		iconStyle: {
			scale: 1.1,
		},
		title: 'Favorite',
		onClick: onClickFavorite,
	})
	favoritedButtonEl.classList.add(favoriteTaskClassName)

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
