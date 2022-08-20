import * as db from '../db.js'
import * as shared from '../shared.js'
import { El } from './el.js'

export class TimeInputHistoryStack {
	constructor(el) {
		this._backwardsStack = []
		this._el = undefined
		this._forwardsStack = []
	}

	get() {
		const selection = document.getSelection()
		const value = this._el.innerText

		// fix for firefox weirdness when all the text is selected
		// SEE https://bugzilla.mozilla.org/show_bug.cgi?id=688379
		// SEE https://bugzilla.mozilla.org/show_bug.cgi?id=569190
		if (selection.anchorNode === this._el) {
			return { end: value.length, start: 0, value }
		}

		if (!this._el.contains(selection.anchorNode)) {
			return { end: value.length, start: 0, value }
		}

		const range = selection.getRangeAt(0).cloneRange()
		const end = Math.max(range.startOffset, range.endOffset)
		const start = Math.min(range.startOffset, range.endOffset)
		return { end, start, value }
	}

	paste() {
		const { value } = this.get()

		const range = document.createRange()
		range.setStart(this._el.firstChild, 0)
		range.setEnd(this._el.firstChild, value.length)

		const selection = document.getSelection()
		selection.removeAllRanges()
		selection.addRange(range)

		setTimeout(() => this._el.onchange(), 10)
	}

	popBackwards() {
		if (this._backwardsStack.length === 0) return
		this._forwardsStack.push(this.get())
		this.set(this._backwardsStack.pop())
	}

	popForwards() {
		if (this._forwardsStack.length === 0) return
		this._backwardsStack.push(this.get())
		this.set(this._forwardsStack.pop())
	}

	push(value, start, end) {
		this._forwardsStack.length = 0
		this._backwardsStack.push(this.get())
		this.set({ end, start, value })
	}

	set({ end, start, value }) {
		const changed = this._el.innerText !== value

		if (changed) {
			this._el.innerText = value
		}

		const range = document.createRange()
		range.setStart(this._el.firstChild, start)
		range.setEnd(this._el.firstChild, end)

		const selection = document.getSelection()
		if (this._el.contains(selection.anchorNode)) {
			selection.removeAllRanges()
			selection.addRange(range)
		}

		if (changed) {
			this._el.onchange()
		}
	}

	setEl(el) {
		this._el = el
	}
}

function TimeInputInner({ timeInputHistoryStack, onChange }) {
	async function onKeyDown(e) {
		let { start, end, value } = timeInputHistoryStack.get()

		if (e.ctrlKey) {
			if (e.key === 'a') {
				return
			}
			if (e.key === 'c') {
				navigator.clipboard.writeText(start === end ? value : value.slice(start, end))
				return
			}
			if (e.key === 'v') {
				timeInputHistoryStack.paste()
				return
			}
			if (e.key === 'z') {
				timeInputHistoryStack.popBackwards()
				return
			}
			if (e.key === 'Z') {
				timeInputHistoryStack.popForwards()
				return
			}
		}
		if (e.key === 'ArrowLeft') return
		if (e.key === 'ArrowRight') return
		if (e.key === 'Tab') return

		e.preventDefault()

		if (e.key === 'Backspace') {
			if (start !== end) {
				const chars = []
				for (let i = 0; i < value.length; i++) {
					const char = value[i]
					if (char !== ':' && i >= start && i < end) {
						chars.push('0')
					}
					else {
						chars.push(char)
					}
				}
				value = chars.join('')
				timeInputHistoryStack.push(value, start, end)
				return
			}
			if (value[start - 1] === ':') start--
			if (start <= 0) return
			value = value.slice(0, start - 1) + '0' + value.slice(start)
			timeInputHistoryStack.push(value, start - 1, start - 1)
			return
		}

		let digit = parseInt(e.key)
		if (isNaN(digit)) {
			return
		}

		if (start === value.length) {
			start--
		}

		if (value[start] === ':') {
			start++
		}

		if (value[start - 1] === ':') {
			digit = Math.min(5, digit)
		}

		value = value.slice(0, start) + digit + value.slice(start + 1)
		start = start + 1 + (value[start + 1] === ':' ? 1 : 0)
		timeInputHistoryStack.push(value, start, start)
	}

	const el = El('div', {
		contentEditable: true,
		style: {
			boxSizing: 'border-box',
			color: 'var(--color-theme-900)',
			fontSize: 14,
			height: '32px !important',
			padding: '4px 10px 6px 8px',
			paddingRight: '8px !important',
			paddingTop: '8px !important',
			textAlign: 'center',
			width: 'fit-content',
		},
		onChange,
		onKeyDown,
	}, shared.formatDuration(0))

	timeInputHistoryStack.setEl(el)

	return el
}

export function TimeInput({ timeInputHistoryStack, onChange }) {
	return El('div', {
		style: {
			border: '1px solid var(--border-primary)',
			borderRadius: 10,
			boxSizing: 'border-box',
			height: '32px !important',
			transition: 'all .3s ease',
			width: 'fit-content',
			':hover': {
				borderColor: 'var(--color-primary)',
				outline: 'none',
			},
			':focus': {
				borderColor: 'var(--color-primary)',
				outline: 'none',
			},
		},
	}, [
		TimeInputInner({ timeInputHistoryStack, onChange }),
	])
}
