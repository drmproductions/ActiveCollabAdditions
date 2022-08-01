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

export function El(selector, options, children) {
	if (options && typeof options === 'string' || Array.isArray(options)) {
		children = options
		options = undefined
	}

	const [tag, ...classNames] = selector.split('.')

	const el = document.createElement(tag)

	ElWrapper.initialize()
	const wrapper = new ElWrapper(el)

	if (classNames) {
		for (const className of classNames)
			el.classList.add(className)
	}

	if (options) {
		for (let [k1, v1] of Object.entries(options)) {
			if (k1.startsWith('on'))
				k1 = k1.toLowerCase()
			switch (k1) {
				case 'onconnected':
				case 'ondisconnected':
					wrapper[k1] = v1
					break
				case 'style':
					for (const [k2, v2] of Object.entries(v1))
						el.style[k2] = v2
					break
				default:
					el[k1] = v1
			}
		}
	}

	if (typeof children === 'string') {
		el.innerText = children
	}
	else if (Array.isArray(children)) {
		for (const child of children)
			el.appendChild(child)
	}

	return wrapper
}
