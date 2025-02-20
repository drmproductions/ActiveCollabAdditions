import * as utils from '../utils.js'

const numberToPixelsExcludedNames = ['flex-basis', 'flex-grow', 'flex-shrink', 'font-weight', 'line-height', 'opacity', 'scale', 'z-index']
const styleEl = document.createElement('style')
const styleMap = new Map()
const pendingRules = []

export function formatNumberToPixels(name, value) {
	if (typeof value !== 'number') return value
	if (numberToPixelsExcludedNames.includes(name)) return value
	return `${value}px`
}

function get(def) {
	const key = utils.hash(def)
	let name = styleMap.get(key)
	if (name) return [name, false]
	name = `generated_rule_${styleMap.size}`
	styleMap.set(key, name)
	return [name, true]
}

function insertRule(rule) {
	if (styleEl.sheet) {
		styleEl.sheet.insertRule(rule, 0)
	}
	else {
		pendingRules.push(rule)
	}
}

export function init() {
	document.head.appendChild(styleEl)
	for (const pendingRule of pendingRules) {
		styleEl.sheet.insertRule(pendingRule, 0)
	}
	pendingRules.length = 0
}

export function useAnimation(def) {
	const [name, isNew] = get(def)
	if (!isNew) return name

	const chunks = []
	chunks.push(`@keyframes ${name}`)
	chunks.push('{')
	for (let [name, subDef] of Object.entries(def)) {
		chunks.push(isNaN(parseInt(name)) ? name : `${name}%`)
		chunks.push('{')
		for (let [name, value] of Object.entries(subDef)) {
			name = name.replace(/[A-Z]/g, i => `-${i.toLowerCase()}`)
			value = formatNumberToPixels(name, value)
			chunks.push(`${name}:${value};`)
		}
		chunks.push('}')
	}
	chunks.push('}')

	const css = chunks.join('')
	insertRule(css)

	return name
}

export function useStyle(def) {
	const [name, isNew] = get(def)
	if (!isNew) return name

	const rules = []
	rules.push({ selector: `.${name}`, chunks: [], def })
	for (let i = 0; i < rules.length; i++) {
		const { selector, chunks, def } = rules[i]
		chunks.push(selector)
		chunks.push('{')
		for (let [name, value] of Object.entries(def)) {
			const name0 = name.trimStart()[0]
			if (name0 === ':' || name0 === '>' || name0 === '.' || name[0] === ' ') {
				rules.push({ selector: `${selector}${name}`, chunks: [], def: value })
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
		insertRule(css)
	}
	return name
}
