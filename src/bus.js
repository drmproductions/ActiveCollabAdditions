let chan
let messageFuncsIdx = 0

const messageFuncsMap = new Map()

export function deinit() {
	chan.close()
	chan = undefined
}

export function emit(kind, { data, local } = { data: undefined, local: false }) {
	if (data) Object.freeze(data)

	const message = Object.freeze({ kind, data })

	for (const func of messageFuncsMap.values())
		func(message)

	if (!local) chan.postMessage(message)
}

export function onMessage(func) {
	const idx = messageFuncsIdx++
	messageFuncsMap.set(idx, func)
	return () => messageFuncsMap.delete(idx)
}

export function init() {
	chan = new BroadcastChannel('messages')
	chan.onmessage = ({ data: { kind, data } }) => {
		emit(kind, { data, local: true })
	}
}
