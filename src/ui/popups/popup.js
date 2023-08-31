import { El } from '../el.js'

export function Popup(options = {}, children) {
	let style
	switch (options.variation) {
		case 'outline':
			style = {
				backgroundColor: 'var(--page-paper-main)',
				borderColor: 'var(--border-primary)',
				borderRadius: 7.5,
				borderStyle: 'solid',
				borderWidth: 1,
				boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				color: 'var(--color-theme-900)',
				overflow: 'hidden',
				position: 'relative',
				...options?.style,
			}
			break
		default:
			style = {
				backgroundColor: 'var(--page-paper-main)',
				borderRadius: 6,
				boxShadow: 'var(--shadow-primary)',
				color: 'var(--color-theme-900)',
				overflow: 'hidden',
				position: 'relative',
				...options?.style,
			}
	}

	if (options.target) {
		const { x, y, width, height } = options.target.getBoundingClientRect()

		style.$ = {
			position: 'fixed',
			top: y + height + (options.offset ?? 8),
		}

		switch (options.halign) {
			case 'end':
				style.$.right = x
				break
			case 'start':
				style.$.left = x
				break
			case 'start-end':
				style.$.left = x + width
				style.$.transform = 'translateX(-100%)'
				break
			default:
				style.$.transform = 'translateX(-50%)'
				style.$.left = x + (width / 2)
		}
	}

	return El('div', { style, ...options }, children)
}
