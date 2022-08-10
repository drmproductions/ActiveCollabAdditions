import * as overlay from '../overlay.js'
import * as preferences from '../../preferences.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'
import { El } from '../el.js'
import { Timer } from '../timer.js'

export function hide() {
	overlay.hide('preferences')
}

export async function show() {
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

	const timersMinimumEntryEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: await preferences.getTimersMinimumEntry(),
		async onChange() {
			await preferences.setTimersMinimumEntry(parseInt(this.value))
		},
	}, [
		El('option', { value: 0 }, 'No Minimum'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 45 }, '45 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	])

	const timersRoundingIntervalEl = El('select', {
		style: {
			paddingTop: '6px !important',
			width: 'fit-content',
		},
		value: await preferences.getTimersRoundingInterval(),
		async onChange() {
			await preferences.setTimersRoundingInterval(parseInt(this.value))
		},
	}, [
		El('option', { value: 0 }, 'Don\'t Round'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	])

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
		El('option', { value: 'default' }, 'Default'),
		El('option', { value: 'stop-light' }, 'Stop Light'),
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
		El('option', { value: 'default' }, 'Default'),
		El('option', { value: 'outline' }, 'Outline'),
	])

	const dialogEl = Dialog({ width: 550 }, [
		DialogHeader('Preferences', [
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		DialogBody({}, [
			El('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, [
				El('div', { style: { display: 'flex', gap: 24 } }, [
					El('div', [
						El('h2', 'Default Job Type'),
						timersDefaultJobTypeEl,
					]),
					El('div', [
						El('h2', 'Minimum Entry'),
						timersMinimumEntryEl,
					]),
					El('div', [
						El('h2', 'Rounding Interval'),
						timersRoundingIntervalEl,
					]),
				]),
				El('div', { style: { display: 'flex', gap: 24 } }, [
					El('div', [
						El('h2', 'Color Scheme'),
						timersColorSchemeEl,
					]),
					El('div', [
						El('h2', 'Style'),
						timersStyleEl,
					]),
					El('div', { style: { display: 'flex', flexDirection: 'column' } }, [
						El('h2', 'Timer Preview'),
						El('div', { style: { display: 'flex', gap: 8 } }, [
							Timer({ inert: { title: 'Initial' }, menuButton: false }),
							Timer({ inert: { title: 'Paused', className: 'paused' }, menuButton: false }),
							Timer({ inert: { title: 'Running', className: 'running' }, menuButton: false }),
						]),
					]),
				]),
			]),
		]),
	])
	overlay.show('preferences', {}, dialogEl)
}
