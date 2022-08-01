const cache = new Map()

export async function set(key, value) {
	cache.set(key, value)
}

export async function useCache(key, func) {
	if (cache.has(key)) {
		return cache.get(key)
	}
	const value = await func()
	cache.set(key, value)
	return value
}
