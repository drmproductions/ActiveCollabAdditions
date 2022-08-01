import * as dialog from './dialog.js'
import { El } from '../el.js'
import { Dialog, DialogBody, DialogHeader, DialogHeaderButton } from './dialog.js'

export function hide() {
	dialog.hide('settings')
}

export function show() {
	function onConnected() {}
	function onDisconnected() {}

	const dialogEl = Dialog({ onConnected, onDisconnected }, [
		DialogHeader('Settings', [
			DialogHeaderButton({
				icon: angie.icons.svg_icons_cancel,
				iconStyleExtra: { scale: 1.7 },
				onClick: () => hide(),
			}),
		]),
		DialogBody(),
	])
	dialog.show('settings', dialogEl)
}
