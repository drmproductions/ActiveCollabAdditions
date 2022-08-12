import * as utils from '../utils.js'
import { El, getEl } from './el.js'

function Overlay(id, options, children) {
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

	return El(`div.acit-overlay.acit-overlay-${id}`, {
		dataset: { id },
		style,
		onClick(e) {
			if (e.target !== this) return
			hide(id)
		},
		onConnected(el) {
			setTimeout(() => el.style.opacity = 1, 10)
		},
		onContextMenu(e) {
			if (e.target !== this) return
			e.preventDefault()
		},
	}, children)
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

	const topOverlay = Array.from(document.querySelectorAll(`.acit-overlay`)).pop()
	if (topOverlay) {
		hide(topOverlay.dataset.id)
	}
}

export function get(id) {
	return document.querySelector(`.acit-overlay-${id}`)
}

export function hide(id) {
	const overlay = get(id)
	if (!overlay) return

	if (openCount() - 1 === 0) {
		window.removeEventListener('keydown', closeOnEscape)
		window.removeEventListener('mousewheel', preventScrolling)
	}

	overlay.style.opacity = 0
	setTimeout(() => overlay.parentNode.remove(), 200)
}

export function isOpen(id) {
	return Boolean(document.querySelector(`.acit-overlay-${id}`))
}

function openCount() {
	return document.querySelectorAll(`.acit-overlay`).length
}

function preventScrolling(e) {
	if (utils.getScrollParent(e.target) === document.body.parentNode) {
		e.preventDefault()
	}
}

export function show(id, options, children) {
	if (isOpen(id)) return

	if (openCount() === 0) {
		window.addEventListener('keydown', closeOnEscape)
		window.addEventListener('mousewheel', preventScrolling, { passive: false })
	}

	const overlay = Overlay(id, options, children)
	document.body.appendChild(overlay)
}
