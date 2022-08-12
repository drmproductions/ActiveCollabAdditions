import * as overlay from '../overlay.js'
import { Popup } from './popup.js'
import { El, setChildren } from '../el.js'

function Body(children) {
	return El('div', {
		style: {
			display: 'flex',
			flexDirection: 'column',
			maxHeight: 307,
			width: 258,
		},
	}, children)
}

function Filter({ placeholder, onFilter }) {
	const inputEl = El('input', {
		placeholder: placeholder ?? 'Filter...',
		style: {
			borderRadius: '8px !important',
			fontWeight: 400,
			height: 32,
			letterSpacing: '0.02em',
			lineHeight: 1.375,
			paddingBottom: 3.75,
			paddingLeft: 8,
			paddingRight: 8,
			paddingTop: 4,
		},
		type: 'text',
		onKeyUp() {
			onFilter?.(this.value)
		},
	})

	return El('div', {
		style: {
			display: 'flex',
			padding: 15,
			paddingBottom: 11.25,
		},
		onConnected() {
			inputEl.focus()
		},
	}, inputEl)
}

function List(children) {
	return El('div', {
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: 3.75,
			overflowY: 'auto',
			paddingBottom: 10,
		},
	}, children)
}

function ListItem({ onClick }, children) {
	return El('div', {
		type: 'text',
		style: {
			alignItems: 'center',
			color: 'var(--color-theme-900)',
			cursor: 'pointer',
			display: 'flex',
			flexShrink: 0,
			gap: 7.5,
			height: 28,
			paddingLeft: 15,
			paddingRight: 15,
			':hover': {
				backgroundColor: 'var(--color-theme-200)',
			},
		},
		onClick,
	}, children)
}

export function show({
	multi,
	placeholder,
	target,
	onClick,
	onUpdate,
}) {
	let filteredItems
	let items

	const listEl = List()

	const bodyEl = Body([
		Filter({
			placeholder,
			onFilter(value) {
				filter(value)
				draw()
			},
		}),
		listEl,
	])

	function draw() {
		const els = filteredItems.map((item) => {
			const { id, text, checked, imageSrc } = item
			const children = []

			if (imageSrc) {
				children.push(El('img', {
					style: { borderRadius: 24 },
					width: 24,
					height: 24,
					src: imageSrc,
				}))
			}

			children.push(text)

			if (multi) {
				children.push(El('svg', {
					width: 16,
					height: 16,
					viewBox: '0 0 16 16',
					fill: 'transparent',
					style: {
						marginLeft: 'auto',
					},
				}, [
					El('g', { fillRule: 'evenodd' }, [
						El('circle', {
							stroke: checked ? 'var(--color-secondary)' : 'var(--color-theme-500)',
							cx: 8, cy: 8, r: 7.5,
						}),
						El('circle', {
							style: { transform: `scale(${ checked ? 1 : 0 })` },
							fill: 'var(--color-secondary)',
							cx: 8, cy: 8, r: 5,
						}),
					]),
				]))
			}

			return ListItem({
				async onClick() {
					const action = await onClick({ id, checked })
					switch (action) {
						case 'hide':
							overlay.hide('list')
							break
						case 'toggle':
							item.checked = !item.checked
							draw()
							break
						default:
							await update()
					}
				},
			}, children)
		})
		setChildren(listEl, els)
	}

	function filter(filterText) {
		filterText = filterText.toLowerCase()
		filteredItems = items.filter(({ text }) => text.toLowerCase().includes(filterText))
	}

	async function update() {
		items = await onUpdate()
		filter('')
		draw()
	}

	update()

	const popupEl = Popup({
		halign: 'start',
		offset: 0,
		target,
		variation: 'outline',
	}, bodyEl)

	overlay.show('list', { variation: 'popup' }, popupEl)
}
