export function call(func) {
	return func()
}

export function getScrollParent(node) {
	if (node == null) {
		return null
	}
	if (node.scrollHeight > node.clientHeight) {
		return node
	}
	return getScrollParent(node.parentNode)
}

export function hash(value) {
	if (typeof value !== 'object') {
		return value
	}

	const chunks = []
	function append(value) {
		if (Array.isArray(value)) {
			for (const value2 of value) {
				if (typeof value2 === 'object') {
					append(value2)
					continue
				}
				chunks.push(value2)
			}
			return
		}

		const keys = Object.keys(value)
		keys.sort((a, b) => a.localeCompare(b))
		for (const key of keys) {
			chunks.push(key)
			const value2 = value[key]
			if (typeof value2 === 'object') {
				append(value2)
				continue
			}
			if (typeof value2 === 'string') {
				chunks.push('"')
			}
			chunks.push(value2)
		}
	}
	append(value)
	return chunks.join('')
}
