import * as preferences from '../preferences.js'
import * as utils from '../utils.js'
import { El } from './el.js'

function Overlay(id, options = {}, children) {
	const style = {
		alignItems: 'center',
		bottom: 0,
		display: 'flex',
		justifyContent: 'center',
		left: 0,
		position: 'fixed',
		right: 0,
		top: 0,
		zIndex: 10000,
	}

	switch (options.variation) {
		case 'popup':
			break
		default:
			style.background = 'var(--modal-background)'
			style.opacity = 0
			style.transition = 'opacity 200ms'
	}

	return El(`div.acit-overlay.acit-overlay-${id}`, {
		dataset: { id },
		style,
		onClick(e) {
			if (e.target !== this) return
			options?.onDismiss?.()
			hide(id)
		},
		async onConnected() {
			setTimeout(() => this.style.opacity = 1, 10)
			if (options.blur !== false) {
				if (await preferences.getBlurOverlays()) {
					this.style.backdropFilter = 'blur(2px)'
				}
			}
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
	setTimeout(() => overlay.remove(), 200)
}

export function isOpen(id) {
	return Boolean(document.querySelector(`.acit-overlay-${id}`))
}

function openCount() {
	return document.querySelectorAll(`.acit-overlay`).length
}

function preventScrolling(e) {
	if (utils.getScrollParent(e.target) === document.documentElement) {
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

	const parent = document.body.querySelector('[data-focus-lock-disabled]') ?? document.body
	parent.appendChild(overlay)
}
