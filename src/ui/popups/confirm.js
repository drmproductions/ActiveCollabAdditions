import * as overlay from '../overlay.js'
import { Popup } from './popup.js'
import { El } from '../el.js'

function Button({ onClick }, children) {
	return El('div', {
		style: {
			alignItems: 'center',
			cursor: 'pointer',
			display: 'flex',
			flexBasis: 0,
			flexGrow: 1,
			flexShrink: 1,
			justifyContent: 'center',
			paddingBottom: 12,
			paddingLeft: 36,
			paddingRight: 36,
			paddingTop: 12,
			whiteSpace: 'nowrap',
			width: 0,
			':hover': {
				backgroundColor: 'var(--color-theme-300)',
			},
			':not(:last-child)': {
				borderRight: '1px solid var(--border-primary)',
			},
		},
		onClick,
	}, children)
}

export async function show({ message, no = 'No', yes = 'Yes', target }) {
	let resolve

	const popupEl = Popup({ target }, [
		El('div', {
			style: {
				display: 'flex',
				flexDirection: 'column',
			},
		}, [
			El('div', {
				style: {
					alignItems: 'center',
					display: 'flex',
					padding: 16,
					justifyContent: 'center',
					borderBottom: '1px solid var(--border-primary)',
				},
			}, message),
			El('div', {
				style: {
					display: 'flex',
				},
			}, [
				Button({
					onClick() {
						overlay.hide('confirm')
						resolve(false)
					},
				}, no),
				Button({
					onClick() {
						overlay.hide('confirm')
						resolve(true)
					},
				}, yes),
			]),
		]),
	])

	overlay.show('confirm', {
		onDismiss() {
			resolve(false)
		},
	}, popupEl)

	return new Promise(r => {
		resolve = r
	})
}
