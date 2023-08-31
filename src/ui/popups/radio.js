import * as overlay from '../overlay.js'
import { Popup } from './popup.js'
import { El } from '../el.js'

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

function List(children) {
	return El('div', {
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: 3.75,
			overflowY: 'auto',
			paddingTop: 8,
			paddingBottom: 10,
		},
	}, children)
}

function ListItem({ id, onClick }, children) {
	return El('div', {
		dataset: { id },
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
			'.highlighted': {
				backgroundColor: 'var(--color-theme-200)',
			},
			':hover': {
				backgroundColor: 'var(--color-theme-200)',
			},
		},
		onClick,
	}, children)
}

export function show({
	placeholder,
	target,
	onClick,
	onUpdate,
}) {
	let items

	const listEl = List()

	const bodyEl = Body([
		listEl,
	])

	function draw() {
		const els = items.map((item, index) => {
			const { id, text, checked } = item
			const children = []

			children.push(text)

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
						style: { transform: `scale(${checked ? 1 : 0})` },
						fill: 'var(--color-secondary)',
						cx: 8, cy: 8, r: 5,
					}),
				]),
			]))

			const el = ListItem({
				id,
				async onClick() {
					const action = await onClick({ id, checked })
					switch (action) {
						case 'hide':
							overlay.hide('list')
							break
						case 'toggle':
							for (const otherItem of items) {
								if (otherItem === item) continue
								otherItem.checked = false
							}
							item.checked = !item.checked
							draw()
							break
						default:
							await update()
					}
				},
			}, children)

			return el
		})

		El.setChildren(listEl, els)
	}

	async function update() {
		items = await onUpdate()
		draw()
	}

	update()

	const popupEl = Popup({
		halign: 'start-end',
		offset: 0,
		target,
		variation: 'outline',
	}, bodyEl)

	overlay.show('list', { blur: false, variation: 'popup' }, popupEl)
}
