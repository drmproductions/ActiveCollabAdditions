import * as api from '../../api.js'
import * as bus from '../../bus.js'
import * as db from '../../db.js'
import * as dialog from './dialog.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { formatDuration, getTimerDuration, parseTime } from '../timer.js'
import { useCache } from '../../cache.js'

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
	dialog.hide('timer')
}

export async function show({ projectId, taskId, dialogOptions }) {
	const overlayOptions = dialogOptions?.overlayOptions

	const timeEl = El('input', {
		style: {
			boxSizing: 'border-box',
			height: '32px !important',
			paddingTop: '8px !important',
			paddingRight: '8px !important',
			width: (formatDuration(0).length === 5 ? 52 : 71) + 'px !important',
		},
		type: 'text',
		value: formatDuration(0),
		async onChange() {
			await createOrUpdateTimer(projectId, taskId, {
				duration: parseTime(this.value),
				started_at: Date.now(),
			})
		},
		onKeyDown(e) {
			// TODO allow ctrl-a, ctrl-c, ctrl-v, etc

			if (e.key === 'ArrowLeft') return
			if (e.key === 'ArrowRight') return

			e.preventDefault()

			if (e.key === 'Backspace') {
				let start = this.selectionStart
				const { value } = this
				if (value[start - 1] === ':') start--
				if (start <= 0) return
				this.value = value.slice(0, start - 1) + '0' + value.slice(start)
				this.selectionStart = start - 1
				this.selectionEnd = start - 1
				this.dispatchEvent(new Event('change'))
				return
			}

			let digit = parseInt(e.key)
			if (isNaN(digit)) return

			let start = this.selectionStart
			if (start === this.value.length) start--

			const { value } = this
			if (value[start] === ':') start++

			if (value[start - 1] === ':') {
				digit = Math.min(5, digit)
			}

			this.value = value.slice(0, start) + digit + value.slice(start + 1)

			let delta = 1
			if (this.value[start + 1] === ':') delta++
			this.selectionStart = start + delta
			this.selectionEnd = start + delta
			this.dispatchEvent(new Event('change'))
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
			isBillableEl.checked = await useCache(`task-is-billable-${projectId}-${taskId}`, async () => {
				const res = await api.fetchTask(projectId, taskId)
				return res.single.is_billable
			})
			isBillableEl.disabled = false
		},
	}, 'Follow Task')
	const jobTypeEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content'
		},
		value: await db.getSetting('timersDefaultJobType') ?? angie.collections.job_types[0]?.id,
		async onChange() {
			await createOrUpdateTimer(projectId, taskId, {
				jobType: this.value,
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
		await db.deleteTimer(projectId, taskId)
	}

	function onClickSubmit() {
	}

	async function update(stillUpdateTimeIfRunning) {
		const timer = await db.getTimer(projectId, taskId)
		if (!timer) return

		if (!timer.running || stillUpdateTimeIfRunning) {
			timeEl.value = formatDuration(getTimerDuration(timer))
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

		if (typeof timer.jobType === 'string') {
			jobTypeEl.value = timer.jobType
		}

		return timer
	}

	async function onConnected(el) {
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'timer-created':
				case 'timer-deleted':
				case 'timer-updated':
					if (data.projectId !== projectId) break
					if (data.taskId !== taskId) break
					if (kind === 'timer-deleted') {
						hide()
					}
					else {
						update()
					}
					break
				case 'timers-deleted':
					hide()
					break
			}
		})
		const timer = update(true)
		if (!timer) {
			hide()
			return
		}

		descriptionEl.focus()

		if (typeof timer.isBillable !== 'boolean') {
			isBillableEl.checked = await useCache(`task-is-billable-${projectId}-${taskId}`, async () => {
				const res = await api.fetchTask(projectId, taskId)
				return res.single.is_billable
			})
		}
		isBillableEl.disabled = false
	}

	function onDisconnected() {
		unsub()
	}

	const name = await useCache(`task-name-${projectId}-${taskId}`, async () => {
		const res = await api.fetchTask(timer.projectId, timer.taskId)
		return res.single.name
	})

	const dialogEl = Dialog({ onConnected, onDisconnected, width: 550, ...dialogOptions }, [
		DialogHeader(name, [
			DialogHeaderButton({
				icon: angie.icons.svg_icons_icon_submit_time,
				iconStyleExtra: { scale: 1.3 },
				title: 'Submit',
				onClick: onClickSubmit,
			}),
			DialogHeaderButton({
				icon: angie.icons.main_menu_icon_trash,
				iconStyleExtra: { scale: 1.2 },
				title: 'Delete',
				onClick: onClickDelete,
			}),
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		bodyEl,
	])
	dialog.show('timer', dialogEl, overlayOptions)
}
