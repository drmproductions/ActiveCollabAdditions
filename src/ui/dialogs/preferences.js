import * as dialog from './dialog.js'
import * as preferences from '../../preferences.js'
import { El } from '../el.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'

export function hide() {
	dialog.hide('preferences')
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
		]),
	])
	dialog.show('preferences', dialogEl)
}
