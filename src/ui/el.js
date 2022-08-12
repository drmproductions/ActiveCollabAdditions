import { formatNumberToPixels, useStyle } from './style.js'

const svgTags = [
	'circle',
	'g',
	'path',
	'svg',
]

class ElWrapper extends HTMLElement {
	static initialized = false

	static initialize() {
		if (ElWrapper.initialized) return
		// NOTE ignore the following comment until we get hot reload working with ES modules
		// you can't reuse custom element names, so we just append a number to the end that gets incremented
		window.customElements.define('acit-el-' + (window.acit_el = (window.acit_el ?? 0) + 1), ElWrapper)
		ElWrapper.initialized = true
	}

	constructor(el) {
		super()
		this._el = el
		this.onconnected = undefined
		this.ondisconnected = undefined
		this.style.display = 'contents'
		this.append(el)
	}

	connectedCallback() {
		this.onconnected?.(this._el)
	}

	disconnectedCallback() {
		this.ondisconnected?.(this._el)
	}
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
		: document.createElement(tag)

	if (classNames) {
		for (const className of classNames)
			el.classList.add(className)
	}

	if (options?.onConnected || options?.onDisconnected) {
		if (isSVG) {
			throw new Error(`onConnected and onDisconnected is not supported on SVGElements right now.`)
		}
		ElWrapper.initialize()
		el = new ElWrapper(el)
	}

	setChildren(el, children)
	setOptions(el, options)

	return el
}

export function getEl(el) {
	if (el instanceof ElWrapper) {
		return el.firstChild
	}
	return el
}

export function getTopEl(el) {
	if (el.parentNode instanceof ElWrapper) {
		return el.parentNode
	}
	return el
}

export function getWrapperEl(el) {
	if (el instanceof ElWrapper) {
		return el
	}
	el = el.parentNode
	if (el instanceof ElWrapper) {
		return el
	}
	throw new Error('Passed element is not wrapped in a ElWrapper')
}

export function setChildren(el, children) {
	if (!(el instanceof Element)) return

	el = getEl(el)
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

export function setOptions(el, options) {
	if (!(el instanceof Element)) return
	if (typeof options !== 'object') return

	el = getEl(el)

	const isSVG = el instanceof SVGElement

	for (let [k1, v1] of Object.entries(options)) {
		if (k1.startsWith('on'))
			k1 = k1.toLowerCase()
		switch (k1) {
			case 'onconnected':
			case 'ondisconnected':
				getWrapperEl(el)[k1] = v1
				break
			case 'dataset':
				for (let [k2, v2] of Object.entries(v1)) {
					el.dataset[k2] = v2
				}
			case 'style':
				const normalStyles = v1.$
				if (normalStyles) {
					delete v1.$
					for (let [k2, v2] of Object.entries(normalStyles)) {
						el.style[k2] = formatNumberToPixels(k2, v2)
					}
				}
				if (Object.keys(v1).length > 0) {
					el.classList.add(useStyle(v1))
				}
				if (normalStyles) {
					v1.$ = normalStyles
				}
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

export function El(selector, options, children) {
	return createElement(selector, options, children)
}
