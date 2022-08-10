import { getPreference as get, setPreference as set } from './db.js'

export async function getTimersColorScheme() {
	return await get('timersColorScheme') ?? 'default'
}

export async function getTimersDefaultJobType() {
	return await get('timersDefaultJobType') ?? angie.collections.job_types[0]?.id
}

export async function getTimersMinimumEntry() {
	return await get('timersMinimumEntry') ?? 0
}

export async function getTimersRoundingInterval() {
	return await get('timersRoundingInterval') ?? 0
}

export async function getTimersStyle() {
	return await get('timersStyle') ?? 'default'
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
