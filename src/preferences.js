import {
	deletePreference as del,
	getPreference as get,
	hasPreference as has,
	setPreference as set,
} from './db.js'

export async function deleteTimersMinimumEntry() {
	return await del('timersMinimumEntry')
}

export async function deleteTimersRoundingInterval() {
	return await del('timersRoundingInterval')
}

export function getAngieStopwatchSetting(key) {
	if (!getAngieStopwatchSettingsEnabled()) return
	return angie.initial_data.settings[key]
}

export function getAngieStopwatchSettingsEnabled() {
	return angie.initial_data.settings.rounding_enabled
}

export async function getTimersColorScheme() {
	return await get('timersColorScheme') ?? 'default'
}

export async function getTimersDefaultJobType() {
	return await get('timersDefaultJobType') ?? angie.collections.job_types[0]?.id
}

export async function getTimersMinimumEntry() {
	return await get('timersMinimumEntry') ?? getAngieStopwatchSetting('minimal_time_entry') ?? 0
}

export async function getTimersRoundingInterval() {
	return await get('timersRoundingInterval') ?? getAngieStopwatchSetting('rounding_interval') ?? 0
}

export async function getTimersStyle() {
	return await get('timersStyle') ?? 'default'
}

export async function hasTimersMinimumEntry() {
	return await has('timersMinimumEntry')
}

export async function hasTimersRoundingInterval() {
	return await has('timersRoundingInterval')
}

export async function setTimersColorScheme(value) {
	return await set('timersColorScheme', value)
}

export async function setTimersDefaultJobType(value) {
	return await set('timersDefaultJobType', value)
}

export async function setTimersMinimumEntry(value) {
	return await set('timersMinimumEntry', value)
}

export async function setTimersRoundingInterval(value) {
	return await set('timersRoundingInterval', value)
}

export async function setTimersStyle(value) {
	return await set('timersStyle', value)
}
