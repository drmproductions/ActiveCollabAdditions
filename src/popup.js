(async () => {
  const _browser = globalThis.chrome || globalThis.browser

  const tabs = await _browser.tabs.query({ active: true, lastFocusedWindow: true })

  const tab = tabs[0]
  if (!tab) return

  const url = new URL(tab.url)
  const { origins } = await _browser.permissions.getAll()

  const origin = origins.find(origin => origin.startsWith(url.origin))

  if (!origin) {
    const button = document.createElement('button')
    button.style.whiteSpace = 'nowrap'
    button.innerText = 'Enable Persistent Access'
    button.onclick = async () => {
      const granted = await _browser.permissions.request({ origins: [`${url.origin}/*`] })
      if (granted) window.close()
    }
    document.body.appendChild(button)
    return
  }

  const notice = document.createElement('div')
  notice.style.whiteSpace = 'nowrap'
  notice.innerText = 'Persistent Access Enabled'
  document.body.appendChild(notice)

  // NOTE this does not work right now, it complains about removing a required permission
  // const button = document.createElement('button')
  // button.innerText = 'Disable on this website'
  // button.onclick = async () => {
  //   const removed = await _browser.permissions.remove({ origins: [`${url.origin}`] })
  //   console.log(removed)
  // }
  // document.body.appendChild(button)
})()
