import { El } from '../el.js'

export function Dialog(options = {}, children) {
	const style = {
		backgroundColor: 'var(--page-paper-main)',
		borderRadius: 6,
		boxShadow: 'var(--shadow-primary)',
		color: 'var(--color-theme-900)',
		overflow: 'hidden',
		position: 'relative',
		width: options.width ?? 600,
	}

	if (!options.centered && options.target) {
		const { x, y, width, height } = options.target.getBoundingClientRect()
		style.$ = {
			position: 'fixed',
		}
		if (x > window.innerWidth / 2) {
			const scrollBarWidth = window.innerWidth - document.body.offsetWidth
			const windowWidth = window.innerWidth - scrollBarWidth
			style.$.right = windowWidth - x - width
			if (style.$.right + style.width > windowWidth) {
				style.$.right = window.innerWidth / 2 - style.width / 2
			}
		}
		else {
			style.$.left = x
		}
		if (y > window.innerHeight / 2) {
			style.$.bottom = window.innerHeight - y + 8
		}
		else {
			style.$.top = y + height + 8
		}
	}

	return El('div', { style, ...options }, children)
}

export function DialogBody(options = {}, children) {
	const style = {
		maxHeight: 'calc(100vh - 120px)',
		overflowY: 'auto',
		padding: '0 20px 20px 20px',
	}

	return El('div', { style, ...options }, children)
}

export function DialogHeader(title, buttons) {
	const style = {
		// backgroundColor: 'var(--color-theme-400)',
		display: 'flex',
	}

	const labelStyle = {
		fontSize: 20,
		fontWeight: 700,
		marginRight: 'auto',
		padding: '20px 0 20px 20px',
	}

	return El('div', { style }, [
		El('div', { style: labelStyle }, title),
		...buttons,
	])
}

export function DialogHeaderButton({ icon, iconStyle, style, title, onClick }) {
	return El('div', {
		style: {
			alignItems: 'center',
			cursor: 'pointer',
			display: 'flex',
			flexShrink: 0,
			justifyContent: 'center',
			width: '66px',
			':hover': {
				' .icon': {
					transform: 'scale(1.2)',
				},
			},
			...style,
		},
		title,
		onClick,
	}, [
		El('span.icon', {
			innerHTML: icon,
			style: {
				alignItems: 'center',
				display: 'flex !important',
				fill: 'var(--color-theme-900)',
				justifyContent: 'center',
				transform: 'scale(1)',
				transformOrigin: 'center',
				transition: 'transform .1s ease',
				...iconStyle,
			},
		}),
	])
}
