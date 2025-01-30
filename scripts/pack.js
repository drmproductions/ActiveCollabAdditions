const fs = require('fs')
const { execSync } = require('child_process')

const target = process.argv[2]

if (!['chromium', 'firefox'].includes(target)) {
	throw new Error(`Invalid target ${target}.`)
}

const version = JSON.parse(fs.readFileSync('src/meta.json')).version
const outDir = `${process.cwd()}/out/${target}/current`
const iconFilenames = fs.readdirSync(`www/icons`).filter(x => x.endsWith('.png'))

let archivePath = `${process.cwd()}/out/${target}/${version}`
switch (target) {
	case 'chromium':
		archivePath += '.zip'
		break
	case 'firefox':
		archivePath += '.xpi'
		break
}

execSync(`rm -rf ${outDir}`)
try { fs.mkdirSync('out') } catch {}
try { fs.mkdirSync(`out/${target}`) } catch {}
try { fs.mkdirSync(outDir) } catch {}

fs.copyFileSync('www/bundle.min.js', `${outDir}/bundle.min.js`)
fs.copyFileSync('www/bundle.min.js.map', `${outDir}/bundle.min.js.map`)
fs.mkdirSync(`${outDir}/icons`)
fs.mkdirSync(`${outDir}/popup`)
fs.copyFileSync('www/popup.html', `${outDir}/popup.html`)
fs.copyFileSync('src/popup.js', `${outDir}/popup.js`)
for (const filename of iconFilenames) {
	fs.copyFileSync(`www/icons/${filename}`, `${outDir}/icons/${filename}`)
}

const manifest = {
	manifest_version: 3,

	author: 'DRM Productions',
	homepage_url: 'https://drminc.com',
	name: 'ActiveCollab Additions',
	version,

	description: [
		'Provides handy shortcuts, including instant access to timers on any ActiveCollab page that lists tasks.',
		'Completely refactored.',
	].join(' '),

	icons: iconFilenames.reduce((obj, filename) => {
		const key = filename.split('.')[0]
		obj[key] = `icons/${filename}`
		return obj
	}, {}),

	action: {
		default_title: 'ActiveCollab Additions',
		default_popup: 'popup.html',
		default_icon: {
			'19': 'icons/16.png',
			'38': 'icons/38.png'
		},
	},

	content_scripts: [{
		id: 'bundle',
		js: ['bundle.min.js'],
		matches: ['*://*/*'],
		world: 'MAIN',
		run_at: 'document_start',
	}],

	optional_host_permissions: ['*://*/*'],

	permissions: ['activeTab'],

	web_accessible_resources: [{
		resources: ['bundle.min.js', 'bundle.min.js.map'],
		matches: ['*://*/*'],
	}],
}

if (target === 'firefox') {
	manifest.browser_specific_settings = {
	  gecko: {
	    id: "ActiveCollabAdditions@drminc.com",
	    strict_min_version: "109.0",
	  },
	  gecko_android: {
	    strict_min_version: "109.0",
	  },
	}
	delete manifest.content_scripts[0].id
}

fs.writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest))

execSync(`cd ${outDir} && zip -r ${archivePath} *`)

// add the background.js for live-reload functionality
fs.copyFileSync('www/background.js', `${outDir}/background.js`)
manifest.background = {
	service_worker: 'background.js',
}
fs.writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest))
