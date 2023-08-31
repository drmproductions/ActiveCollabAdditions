import * as RadioPopup from './popups/radio.js'
import * as api from '../api.js'
import * as bus from '../bus.js'
import * as cache from '../cache.js'
import * as preferences from '../preferences.js'
import * as utils from '../utils.js'
import { El } from './el.js'

let lastValue

const spanStyle = {
  fontWeight: 500,
  fontSize: '0.875rem',
  lineHeight: '1.375',
}

const items = new Map([
  [ 'start-date', 'By Start Date' ],
  [ 'due-date', 'By Due Date' ],
  [ 'project', 'By Project' ],
])

export function GroupTasksBySelect({ id, style: extraStyle }) {
  let unsub

  const titleEl = El(`span.title`, {
    style: {
      ...spanStyle,
      marginRight: 2,
      opacity: 0.6,
    },
  }, 'Group:')

  const valueEl = El(`span.value`, {
    style: spanStyle,
  }, 'By Project')

  const style = {
    border: 'none',
    borderRadius: 'var(--ac-br-6)',
    margin: 0,
    padding: '0px 8px',
    transition: 'background-color 0.3s ease 0s, box-shadow 0.3s ease 0s, color 0.3s ease 0s, border-color 0.3s ease 0s',
    ':hover': {
      backgroundColor: 'var(--color-theme-300)',
      color: 'var(--color-theme-900)',
    },
    ...extraStyle,
  }

  async function onClick() {
    await RadioPopup.show({
      target: this,
      async onClick({ id }) {
        valueEl.innerText = items.get(id)
        await preferences.setUserPageGroupTasksBy(id)
        return 'hide'
      },
      async onUpdate() {
        const selectedId = await preferences.getUserPageGroupTasksBy()
        return Array.from(items.entries()).map(([id, text]) => {
          const checked = id === selectedId
          return { checked, id, text }
        })
      },
    })
  }

  function onConnected() {
    unsub = bus.onMessage(({ kind, data }) => {
      switch (kind) {
        case 'preference-changed':
          const { key } = data
          if (key !== 'userPageGroupTasksBy') return
          update()
          break
      }
    })
  }

  function onDisconnected() {
    unsub?.()
  }

  const el = El(`button.${id}`, {
    style,
    onClick,
    onConnected,
    onDisconnected,
  }, [titleEl, valueEl])

  async function update() {
    const id = await preferences.getUserPageGroupTasksBy()
    valueEl.innerText = items.get(id)
  }

  update()

  return el
}
