// TODO figure out how to do this for firefox, probably an eval in the content script?
const _browser = globalThis.chrome || globalThis.browser
if (_browser.runtime.getManifest().manifest_version == 3) {
    _browser.scripting.unregisterContentScripts().then(() => {
        _browser.scripting.registerContentScripts([{
             id: 'interceptor',
             js: ['interceptor.js'],
             matches: ['*://*/*'],
             world: 'MAIN',
             runAt: 'document_start',
         }])
    })
}
