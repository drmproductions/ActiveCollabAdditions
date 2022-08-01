import * as SettingsDialog from './settings.js'
import * as bus from '../../bus.js'
import * as db from '../../db.js'
import * as dialog from './dialog.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { Timer } from '../timer.js'
import { useCache } from '../../cache.js'

function Project({ name, tasks, timer }) {
	const timersStyle = {
		border: '1px solid var(--border-primary)',
		borderRadius: '6px',
		overflow: 'hidden',
	}

	return El('div', [
		El('h2', { style: { marginTop: '16px' } }, name),
		El('div', { style: timersStyle }, tasks.map(Task))
	])
}

function Task({ name, timer: { project, task } }, index, timers) {
	const style = {
		backgroundColor: index % 2 === 0 ? 'var(--color-theme-300)' : 'var(--color-theme-200)',
		color: 'var(--color-theme-700)',
		display: 'flex',
		fontSize: '12px',
		fontWeight: '500',
		height: '40px',
		borderBottom: index < timers.length - 1 ? '1px solid var(--border-primary)' : '',
	}

	const buttonStyle = {
		alignItems: 'center',
		cursor: 'pointer',
		display: 'flex',
		padding: '0 10px',
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex',
		fill: 'var(--color-theme-600)',
		justifyContent: 'center',
	}

	const labelStyle = {
		alignItems: 'center',
		display: 'flex',
	}

	const timerStyle = {
		alignItems: 'center',
		display: 'flex',
		justifyContent: 'center',
		padding: '0 10px',
	}

	const timerEl = Timer({ project, task })
	timerEl.firstChild.style.marginRight = ''

	function onClickDelete() {
		db.deleteTimer(project, task)
	}

	function onClickSubmit() {
	}

	return El('div', { style }, [
		El('div', { style: timerStyle }, [timerEl]),
		El('div', { style: { ...labelStyle, marginRight: 'auto' } }, name),
		El('div', { onClick: onClickSubmit, style: buttonStyle }, [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_icon_submit_time,
				style: { ...iconStyle, scale: 1.2 },
			}),
		]),
		El('div', { onClick: onClickDelete, style: buttonStyle }, [
			El('span.icon', {
				innerHTML: angie.icons.main_menu_icon_trash,
				style: { ...iconStyle, scale: 1.05 },
			}),
		]),
	])
}

export function hide() {
	dialog.hide('timers')
}

export function show() {
	let unsub

	const bodyEl = DialogBody()
	const bodyMessageStyle = {
		alignItems: 'center',
		display: 'flex',
		fontSize: '16px',
		height: '200px',
		justifyContent: 'center',
	}

	async function onClickDelete() {
		await db.deleteTimers()
		hide()
	}

	function onClickSubmit() {
	}

	function onClickShowSettings() {
		SettingsDialog.show()
	}

	async function onConnected(el) {
		unsub = bus.onMessage(({ kind, data }) => {
			switch (kind) {
				case 'timer-created':
				case 'timer-deleted':
				case 'timers-deleted':
					update()
					break
			}
		})
		update()
	}

	function onDisconnected() {
		unsub()
	}

	async function update() {
		const timeout = setTimeout(() => {
			bodyEl.firstChild.innerHTML = ''
			bodyEl.firstChild.appendChild(El('div', { style: bodyMessageStyle }, 'LOADING...'))
		}, 500)

		const timers = await db.getTimers()
		if (timers.length === 0) {
			clearTimeout(timeout)
			bodyEl.firstChild.innerHTML = ''
			bodyEl.firstChild.appendChild(El('div', { style: bodyMessageStyle }, 'NO TIMERS STARTED'))
			return
		}

		const projectsMap = new Map()
		for (const timer of timers) {
			let project = projectsMap.get(timer.project)
			if (!project) {
				const name = await useCache(`project-name-${timer.project}`, async () => {
					const res = await fetch(`${angie.api_url}/projects/${timer.project}`)
					const json = await res.json()
					return json.single.name
				})
				project = { name, tasks: [], timer }
				projectsMap.set(timer.project, project)
			}
			const name = await useCache(`task-name-${timer.project}-${timer.task}`, async () => {
				const res = await fetch(`${angie.api_url}/projects/${timer.project}/tasks/${timer.task}`)
				const json = await res.json()
				return json.single.name
			})
			project.tasks.push({ name, timer })
		}

		const projects = Array.from(projectsMap.values())
		projects.sort((a, b) => a.name.localeCompare(b.name))

		clearTimeout(timeout)
		bodyEl.firstChild.innerHTML = ''
		for (const project of projects) {
			project.tasks.sort((a, b) => a.name.localeCompare(b.name))
			bodyEl.firstChild.appendChild(Project(project))
		}
	}

	const dialogEl = Dialog({ onConnected, onDisconnected }, [
		DialogHeader('Timers', [
			DialogHeaderButton({
				icon: angie.icons.main_menu_icon_system_settings,
				iconStyleExtra: { scale: 1.3 },
				onClick: onClickShowSettings,
			}),
			DialogHeaderButton({
				icon: angie.icons.svg_icons_icon_submit_time,
				iconStyleExtra: { scale: 1.3 },
				onClick: onClickSubmit,
			}),
			DialogHeaderButton({
				icon: angie.icons.main_menu_icon_trash,
				iconStyleExtra: { scale: 1.2 },
				onClick: onClickDelete,
			}),
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				onClick: () => hide(),
			}),
		]),
		bodyEl,
	])
	dialog.show('timers', dialogEl)
}
