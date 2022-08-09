import * as utils from '../utils.js'

const numberToPixelsExcludedNames = ['flex-grow', 'flex-shrink', 'font-weight', 'opacity', 'scale', 'z-index']
const styleEl = document.createElement('style')
const styleMap = new Map()

document.head.appendChild(styleEl)

export function formatNumberToPixels(name, value) {
	if (typeof value !== 'number') return value
	if (numberToPixelsExcludedNames.includes(name)) return value
	return `${value}px`
}

export function useStyle(style) {
	const key = utils.hash(style)
	let className = styleMap.get(key)
	if (className) {
		return className
	}
	className = `generated_class_${styleMap.size}`
	styleMap.set(key, className)

	const rules = []
	rules.push({ selector: `.${className}`, chunks: [], style })
	for (let i = 0; i < rules.length; i++) {
		const { selector, chunks, style } = rules[i]
		chunks.push(selector)
		chunks.push('{')
		for (let [name, value] of Object.entries(style)) {
			const name0 = name.trimStart()[0]
			if (name0 === ':' || name0 === '>' || name0 === '.') {
				rules.push({ selector: `${selector}${name}`, chunks: [], style: value })
				continue
			}
			name = name.replace(/[A-Z]/g, i => `-${i.toLowerCase()}`)
			value = formatNumberToPixels(name, value)
			chunks.push(`${name}:${value};`)
		}
		chunks.push('}')
	}

	for (const { chunks } of rules) {
		const css = chunks.join('')
		styleEl.sheet.insertRule(css, 0)
	}
	return className
}
