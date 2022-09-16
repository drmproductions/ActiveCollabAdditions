import * as overlay from '../overlay.js'
import * as preferences from '../../preferences.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { Timer } from '../Timer.js'

function Column(name, el) {
	return El('div', [
		El('h2', name),
		el,
	])
}

function Row(children) {
	return El('div', {
		style: {
			display: 'flex',
			flexDirection: 'row',
			gap: 16,
		},
	}, children)
}

function TimerPreview(name, timer) {
	return El('div', {
		style: {
			alignItems: 'center',
			display: 'flex',
			flexDirection: 'column',
			gap: 4,
			position: 'relative',
		}
	}, [
		timer,
		El('span', {
			style: {
				bottom: -19,
				color: 'var(--color-theme-900)',
				fontSize: 11,
				left: '50%',
				position: 'absolute',
				transform: 'translateX(-50%)',
				whiteSpace: 'nowrap',
			},
		}, name),
	])
}

export function hide() {
	overlay.hide('preferences')
}

export async function show() {
	const blurOverlaysEl = El('input', {
		checked: await preferences.getBlurOverlays(),
		type: 'checkbox',
		async onChange() {
			await preferences.setBlurOverlays(this.checked)
		},
	})

	const timersDefaultJobTypeEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: await preferences.getTimersDefaultJobType(),
		async onChange() {
			await preferences.setTimersDefaultJobType(parseInt(this.value))
		},
	}, angie.collections.job_types.map(({ id, name }) => {
		return El('option', { value: id }, name)
	}))

	const minimumEntryOptionEls = [
		El('option', { value: 0 }, 'No Minimum'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 45 }, '45 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	]

	const roundingIntervalOptionEls = [
		El('option', { value: 0 }, 'Don\'t Round'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	]

	if (preferences.getAngieStopwatchSettingsEnabled()) {
		minimumEntryOptionEls.push(El('option', { value: -1 }, 'Follow System Default'))
		roundingIntervalOptionEls.push(El('option', { value: -1 }, 'Follow System Default'))
	}

	const minimumEntryValue = await preferences.hasTimersMinimumEntry()
		  ? await preferences.getTimersMinimumEntry()
		  : (preferences.getAngieStopwatchSettingsEnabled() ? -1 : 0)

	const roundingIntervalValue = await preferences.hasTimersRoundingInterval()
		  ? await preferences.getTimersRoundingInterval()
		  : (preferences.getAngieStopwatchSettingsEnabled() ? -1 : 0)

	const timersMinimumEntryEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: minimumEntryValue,
		async onChange() {
			const value = parseInt(this.value)
			if (value === -1) {
				await preferences.deleteTimersMinimumEntry()
			}
			else {
				await preferences.setTimersMinimumEntry(value)
			}
		},
	}, minimumEntryOptionEls)

	const timersRoundingIntervalEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: roundingIntervalValue,
		async onChange() {
			const value = parseInt(this.value)
			if (value === -1) {
				await preferences.deleteTimersRoundingInterval()
			}
			else {
				await preferences.setTimersRoundingInterval(value)
			}
		},
	}, roundingIntervalOptionEls)

	const timersColorSchemeEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: await preferences.getTimersColorScheme(),
		async onChange() {
			await preferences.setTimersColorScheme(this.value)
		},
	}, [
		El('option', { value: 'default' }, 'Theme Accent'),
		El('option', { value: 'stop-light' }, 'Stop Light'),
		El('option', { value: 'classic' }, 'Classic'),
	])

	const timersStyleEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: await preferences.getTimersStyle(),
		async onChange() {
			await preferences.setTimersStyle(this.value)
		},
	}, [
		El('option', { value: 'default' }, 'Filled'),
		El('option', { value: 'outline' }, 'Outline'),
		El('option', { value: 'mixed' }, 'Mixed'),
	])

	const dialogEl = Dialog({}, [
		DialogHeader('Preferences', [
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyle: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		DialogBody({}, [
			El('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, [
				Row([
					Column('Default Job Type', timersDefaultJobTypeEl),
					Column('Minimum Entry', timersMinimumEntryEl),
					Column('Rounding Interval', timersRoundingIntervalEl),
				]),
				Row([
					Column('Color Scheme', timersColorSchemeEl),
					Column('Style', timersStyleEl),
					El('div', { style: { display: 'flex', flexDirection: 'column' } }, [
						El('h2', 'Timer Preview'),
						El('div', { style: { display: 'flex', gap: 8 } }, [
							TimerPreview('Default', Timer({ inert: { title: 'This is how the timer will appear if not started.' }, menuButton: false })),
							TimerPreview('Paused', Timer({ inert: { title: 'This is how the timer will appear when paused.', className: 'paused' }, menuButton: false })),
							TimerPreview('Running', Timer({ inert: { title: 'This is how the timer will appear when running.', className: 'running' }, menuButton: false })),
						]),
					]),
				]),
				Row([
					Column('Blur Overlays', blurOverlaysEl),
				]),
			]),
		]),
	])
	overlay.show('preferences', {}, dialogEl)
}
