import * as overlay from '../overlay.js'
import { Popup } from './popup.js'
import { El } from '../el.js'

export function hide() {
}

export async function show({ message, no = 'No', yes = 'Yes', target }) {
	const bodyStyle = {
		display: 'flex',
		flexDirection: 'column',
	}

	const buttonsStyle = {
		display: 'flex',
	}

	const buttonStyle = {
		alignItems: 'center',
		cursor: 'pointer',
		display: 'flex',
		flexBasis: 0,
		flexGrow: 1,
		flexShrink: 1,
		justifyContent: 'center',
		paddingLeft: 36,
		paddingRight: 36,
		paddingTop: 12,
		paddingBottom: 12,
		whiteSpace: 'nowrap',
		width: 0,
		':hover': {
			backgroundColor: 'var(--color-theme-300)',
		},
		':not(:last-child)': {
			borderRight: '1px solid var(--border-primary)',
		},
	}

	const messageStyle = {
		alignItems: 'center',
		display: 'flex',
		padding: 16,
		justifyContent: 'center',
		borderBottom: '1px solid var(--border-primary)',
	}

	let resolve

	const popupEl = Popup({ target }, [
		El('div', { style: bodyStyle }, [
			El('div', { style: messageStyle }, message),
			El('div', { style: buttonsStyle }, [
				El('div', {
					style: buttonStyle,
					onClick() {
						overlay.hide('confirm')
						resolve(false)
					},
				}, no),
				El('div', {
					style: buttonStyle,
					onClick() {
						overlay.hide('confirm')
						resolve(true)
					},
				}, yes),
			]),
		]),
	])
	overlay.show('confirm', {}, popupEl)

	return new Promise(r => {
		resolve = r
	})
}
