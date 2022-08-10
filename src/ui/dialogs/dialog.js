import * as utils from '../../utils.js'
import { El, getEl } from '../el.js'

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

export function DialogHeaderButton({ icon, iconStyleExtra = {}, title, onClick }) {
	const style = {
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
	}

	const iconStyle = {
		alignItems: 'center',
		display: 'flex !important',
		fill: 'var(--color-theme-900)',
		justifyContent: 'center',
		transform: 'scale(1)',
		transformOrigin: 'center',
		transition: 'transform .1s ease',
	}

	return El('div', { style, title, onClick }, [
		El('span.icon', {
			innerHTML: icon,
			style: { ...iconStyle, ...iconStyleExtra },
		}),
	])
}

function DialogOverlay(id, dialog, options) {
	const style = {
		alignItems: 'center',
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

	if (options?.blur ?? true) {
		style.backdropFilter = 'blur(2px)'
	}

	return El(`div.acit-dialog.acit-${id}-dialog`, {
		dataset: { id },
		style,
		onClick(e) {
			if (e.target !== this) return
			hide(id)
		},
		onConnected() {
			setTimeout(() => getEl(this).style.opacity = 1, 10)
		},
		onContextMenu(e) {
			if (e.target !== this) return
			e.preventDefault()
		},
	}, [dialog])
}

function closeOnEscape(e) {
	if (e.key !== 'Escape') return

	if (e.target instanceof HTMLTextAreaElement) {
		e.target.blur()
		return
	}

	if (e.target instanceof HTMLInputElement) {
		e.target.blur()
		return
	}

	const dialog = Array.from(document.querySelectorAll(`.acit-dialog`)).pop()
	if (dialog) {
		hide(dialog.dataset.id)
	}
}

function openDialogCount() {
	return document.querySelectorAll(`.acit-dialog`).length
}

function preventScrolling(e) {
	if (utils.getScrollParent(e.target) === document.body.parentNode) {
		e.preventDefault()
	}
}

export function hide(id) {
	const dialog = document.querySelector(`.acit-${id}-dialog`)
	if (!dialog) return

	if (openDialogCount() - 1 === 0) {
		window.removeEventListener('keydown', closeOnEscape)
		window.removeEventListener('mousewheel', preventScrolling)
	}

	dialog.style.opacity = 0
	setTimeout(() => dialog.parentNode.remove(), 200)
}

export function show(id, dialog, options) {
	if (document.querySelector(`.acit-${id}-dialog`)) return

	if (openDialogCount() === 0) {
		window.addEventListener('keydown', closeOnEscape)
		window.addEventListener('mousewheel', preventScrolling, { passive: false })
	}

	const overlay = DialogOverlay(id, dialog, options)
	document.body.appendChild(overlay)
}
