import { formatNumberToPixels, useStyle } from './style.js'

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

	let el
	if (tag === 'svg' || tag === 'path') {
		el = document.createElementNS('http://www.w3.org/2000/svg', tag)
	}
	else {
		el = document.createElement(tag)
	}

	const isSVG = el instanceof SVGElement

	if (classNames) {
		for (const className of classNames)
			el.classList.add(className)
	}

	let topEl = el
	if (options?.onConnected || options?.onDisconnected) {
		if (isSVG) {
			throw new Error(`onConnected and onDisconnected is not supported on SVGElements right now.`)
		}
		ElWrapper.initialize()
		topEl = new ElWrapper(el)
	}

	if (children) {
		if (children instanceof Element) {
			el.appendChild(children)
		}
		else if (typeof children === 'string') {
			el.innerText = children
		}
		else if (Array.isArray(children)) {
			for (const child of children) {
				if (!child) continue
				el.appendChild(child)
			}
		}
	}

	if (options) {
		for (let [k1, v1] of Object.entries(options)) {
			if (k1.startsWith('on'))
				k1 = k1.toLowerCase()
			switch (k1) {
				case 'onconnected':
				case 'ondisconnected':
					topEl[k1] = v1
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
					el.classList.add(useStyle(v1))
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

	return topEl ?? el
}

export function getEl(el) {
	if (el instanceof ElWrapper) {
		return el.firstChild
	}
	return el
}

export function El(selector, options, children) {
	return createElement(selector, options, children)
}
