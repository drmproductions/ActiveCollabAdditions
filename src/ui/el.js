import { formatNumberToPixels, useStyle } from './style.js'

const svgTags = [
	'circle',
	'g',
	'path',
	'svg',
]

const customElementClasses = new Map()

function createCustomElement(tag) {
	const customElementClass = customElementClasses.get(tag)
	if (customElementClass) {
		return new customElementClass()
	}
	const { constructor } = document.createElement(tag)
	function CustomElement() {
		return Reflect.construct(constructor, [], CustomElement)
	}
	CustomElement.prototype.connectedCallback = function(e) {
		if (this.onconnected) {
			this.onconnected(e)
		}
	}
	CustomElement.prototype.disconnectedCallback = function(e) {
		if (this.ondisconnected) {
			this.ondisconnected(e)
		}
	}
	Object.setPrototypeOf(CustomElement.prototype, constructor.prototype)
	Object.setPrototypeOf(CustomElement, constructor)
	customElements.define(`custom-${tag}`, CustomElement, { extends: tag })
	customElementClasses.set(tag, CustomElement)
	return new CustomElement()
}

function createElement(selector, options, children) {
	if (options) {
		if (options instanceof Element || typeof options === 'string' || Array.isArray(options)) {
			children = options
			options = undefined
		}
	}

	const [tag, ...classNames] = selector.split('.')

	const isSVG = svgTags.includes(tag)

	let el = isSVG
		? document.createElementNS('http://www.w3.org/2000/svg', tag)
		: createCustomElement(tag)

	if (classNames) {
		for (const className of classNames)
			el.classList.add(className)
	}

	El.setChildren(el, children)
	El.setOptions(el, options)

	return el
}

export function El(selector, options, children) {
	return createElement(selector, options, children)
}

El.getData = (el, key) => {
	return el.dataset[key]
}

El.setChildren = (el, children) => {
	if (!(el instanceof Element)) return

	el.innerHTML = ''

	if (!children) return

	if (children instanceof Element) {
		el.appendChild(children)
	}
	else if (typeof children === 'string') {
		el.innerText = children
	}
	else if (Array.isArray(children)) {
		for (let child of children) {
			if (!child) continue
			if (typeof child === 'string') {
				child = document.createTextNode(child)
			}
			el.appendChild(child)
		}
	}
}

El.setData = (el, data) => {
	if (typeof data !== 'object') return
	for (let [k2, v2] of Object.entries(data)) {
		el.dataset[k2] = v2
	}
}

El.setOptions = (el, options) => {
	if (!(el instanceof Element)) return
	if (typeof options !== 'object') return

	const isSVG = el instanceof SVGElement

	for (let [k1, v1] of Object.entries(options)) {
		if (k1.startsWith('on'))
			k1 = k1.toLowerCase()
		switch (k1) {
			case 'onconnected':
			case 'ondisconnected':
				if (isSVG) {
					throw new Error('onconnected and ondisconnected are not supported on SVG elements')
				}
				el[k1] = v1
				break
			case 'dataset':
				El.setData(el, v1)
				break
			case 'style':
				El.setStyle(el, v1)
				break
			default:
				if (isSVG) {
					el.setAttribute(k1, v1)
				}
				else {
					el[k1] = v1
				}
		}
	}
}

El.setStyle = (el, style) => {
	const normalStyles = style.$
	if (normalStyles) {
		delete style.$
		for (let [k2, v2] of Object.entries(normalStyles)) {
			el.style[k2] = formatNumberToPixels(k2, v2)
		}
	}

	if (Object.keys(style).length > 0) {
		el.classList.add(useStyle(style))
	}

	if (normalStyles) {
		style.$ = normalStyles
	}
}
