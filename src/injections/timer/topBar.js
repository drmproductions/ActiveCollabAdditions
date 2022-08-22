import * as TimersDialog from '../../ui/dialogs/timers.js'
import * as bus from '../../bus.js'
import * as cache from '../../cache.js'
import * as db from '../../db.js'
import * as shared from '../../shared.js'
import { El } from '../../ui/el.js'
import { Timer } from '../../ui/Timer.js'

export default function() {
	const containerEl = document.querySelector('.topbar_items')
	if (!containerEl) return

	const timerEl = Timer({
		menuButtonOptions: { alwaysVisible: true, style: { marginRight: 16 } },
		style: {
			marginLeft: 8,
			pointerEvents: 'all',
			top: 9,
		},
	})

	async function update() {
		let timers = await db.getTimers()
		timers = timers.filter((timer) => shared.getTimerDuration(timer) > 0)
		timers.sort((a, b) => b.started_at - a.started_at)

		const timer = timers.find(timer => timer.running) || timers[0]

		const projectId = timer?.projectId
		const taskId = timer?.taskId

		const prevIds = Timer.getProjectAndTaskId(timerEl)

		if (prevIds.projectId !== projectId || prevIds.taskId !== taskId) {
			Timer.setProjectAndTaskId(timerEl, projectId, taskId)
			await Timer.update(timerEl)

			if (timer) {
				const projectName = await cache.getProjectName({ projectId })
				const taskName = await cache.getTaskName({ projectId: timer.projectId, taskId: timer.taskId })
				timerEl.title = `${projectName} - ${taskName}`
			}
		}
	}

	update()

	containerEl.prepend(El('li.topbar_item.acit-top-bar-timers-button', {
		onClick() {
			TimersDialog.show()
		},
	}, [
		El('button.btn', [
			El('span.icon', {
				innerHTML: angie.icons.svg_icons_time_tracker_icon,
				style: {
					alignItems: 'center',
					display: 'flex !important',
					justifyContent: 'center',
				},
			}),
		]),
	]))

	containerEl.prepend(El('li.topbar_item.acit-top-bar-timer-wrapper', {
		style: {
			margin: 0,
			width: 'fit-content !important',
		},
	}, [timerEl]))

	return bus.onMessage(({ kind, data }) => {
		switch (kind) {
			case 'timer-created':
			case 'timer-deleted':
			case 'timer-updated':
			case 'timers-deleted':
				update()
				break
		}
	})
}
