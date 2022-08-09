import * as db from '../../db.js'
import * as dialog from './dialog.js'
import { El } from '../el.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'

export function hide() {
	dialog.hide('settings')
}

export async function show() {
	const timersDefaultJobTypeEl = El('select', {
		style: { width: 'fit-content' },
		value: await db.getSetting('timersDefaultJobType') ?? angie.collections.job_types[0]?.id,
		async onChange() {
			await db.setSetting('timersDefaultJobType', this.value)
		},
	}, angie.collections.job_types.map(({ id, name }) => {
		return El('option', { value: id }, name)
	}))

	const timersMinimumEntryEl = El('select', {
		style: { width: 'fit-content' },
		value: await db.getSetting('timersMinimumEntry') ?? 0,
		async onChange() {
			await db.setSetting('timersMinimumEntry', this.value)
		},
	}, [
		El('option', { value: 0 }, 'No Minimum'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 15 }, '45 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	])

	const timersRoundingIntervalEl = El('select', {
		style: { width: 'fit-content' },
		value: await db.getSetting('timersRoundingInterval') ?? 0,
		async onChange() {
			await db.setSetting('timersRoundingInterval', this.value)
		},
	}, [
		El('option', { value: 0 }, 'Don\'t Round'),
		El('option', { value: 15 }, '15 Minutes'),
		El('option', { value: 30 }, '30 Minutes'),
		El('option', { value: 60 }, '60 Minutes'),
	])

	const dialogEl = Dialog({}, [
		DialogHeader('Settings', [
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				title: 'Close',
				onClick: () => hide(),
			}),
		]),
		DialogBody({}, [
			El('div', { style: { display: 'flex', gap: 36 } }, [
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
	dialog.show('settings', dialogEl)
}
