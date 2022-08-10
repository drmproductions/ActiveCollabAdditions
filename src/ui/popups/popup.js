import { El } from '../el.js'

export function Popup(options = {}, children) {
	const style = {
		backgroundColor: 'var(--page-paper-main)',
		borderRadius: 6,
		boxShadow: 'var(--shadow-primary)',
		color: 'var(--color-theme-900)',
		overflow: 'hidden',
		position: 'relative',
		...options?.style,
	}

	if (options.target) {
		const { x, y, width, height } = options.target.getBoundingClientRect()
		style.$ = {
			position: 'fixed',
			left: x + (width / 2),
			top: y + height + 8,
			transform: 'translateX(-50%)',
		}
	}

	return El('div', { style, ...options }, children)
}
