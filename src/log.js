function prefix(name) {
	return `[aca${name ? `.${name}` : ''}]`
}

export function e(name, ...args) {
	console.error(prefix(name), ...args)
}

export function i(name, ...args) {
	console.info(prefix(name), ...args)
}

export function w(name, ...args) {
	console.warn(prefix(name), ...args)
}
