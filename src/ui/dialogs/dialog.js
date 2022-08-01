import { El } from '../el.js'

export function Dialog(options = {}, children) {
	const style = {
		backgroundColor: 'var(--page-paper-main)',
		borderRadius: '6px',
		boxShadow: 'var(--shadow-primary)',
		color: 'var(--color-theme-900)',
		overflow: 'hidden',
		position: 'relative',
		width: '600px',
	}

	return El('div', Object.assign({ style }, options), children)
}

export function DialogBody(options = {}) {
	const style = {
		maxHeight: 'calc(100vh - 40px - 40px)',
		overflowY: 'auto',
		padding: '0 20px 20px 20px',
	}

	return El('div', Object.assign({ style }, options))
}

export function DialogHeader(title, buttons) {
	const style = {
		// backgroundColor: 'var(--color-theme-400)',
		display: 'flex',
	}

	const labelStyle = {
		fontSize: '1.5rem',
		fontWeight: '700',
		marginRight: 'auto',
		padding: '20px 0 20px 20px',
	}

	return El('div', { style }, [
		El('div', { style: labelStyle }, title),
		...buttons,
	])
}

export function DialogHeaderButton({ icon, iconStyleExtra = {}, onClick }) {
	const style = {
		alignItems: 'center',
		cursor: 'pointer',
		display: 'flex',
		justifyContent: 'center',
		width: '66px',
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex',
		fill: 'var(--color-theme-900)',
		justifyContent: 'center',
	}

	return El('div', { onClick, style }, [
		El('span.icon', {
			innerHTML: icon,
			style: Object.assign({}, iconStyle, iconStyleExtra),
		}),
	])
}

function DialogOverlay(id, dialog) {
	const style = {
		alignItems: 'center',
		backdropFilter: 'blur(2px)',
		background: 'var(--modal-background)',
		bottom: 0,
		display: 'flex',
		justifyContent: 'center',
		left: 0,
		opacity: 0,
		position: 'fixed',
		right: 0,
		top: 0,
		transition: 'opacity 200ms',
		zIndex: 10000,
	}

	return El(`div.acit-${id}-dialog`, {
		onClick: function (e) {
			if (e.target !== this) return
			hide(id)
		},
		onConnected: function () {
			const el = this.firstChild
			setTimeout(() => {
				el.style.opacity = 1
			}, 10)
		},
		onContextMenu: function (e) {
			if (e.target !== this) return
			e.preventDefault()
		},
		style,
	}, [dialog])
}

export function hide(id) {
	const dialog = document.querySelector(`.acit-${id}-dialog`)
	if (!dialog) return
	dialog.style.opacity = 0
	setTimeout(() => dialog.parentNode.remove(), 200)
}

export function show(id, dialog) {
	if (document.querySelector(`.acit-${id}-dialog`)) return
	const overlay = DialogOverlay(id, dialog)
	document.body.appendChild(overlay)
}
