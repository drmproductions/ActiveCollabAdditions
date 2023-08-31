const fs = require('fs')
const { execSync } = require('child_process')

const target = process.argv[2]

if (!['chromium', 'firefox'].includes(target)) {
	throw new Error(`Invalid target ${target}.`)
}

const version = JSON.parse(fs.readFileSync('src/meta.json')).version
const outDir = `${process.cwd()}/out/${target}/current`
const zipPath = `${process.cwd()}/out/${target}/${version}.zip`
const iconFilenames = fs.readdirSync(`www/icons`).filter(x => x.endsWith('.png'))

execSync(`rm -rf ${outDir}`)
try { fs.mkdirSync('out') } catch {}
try { fs.mkdirSync(`out/${target}`) } catch {}
try { fs.mkdirSync(outDir) } catch {}

fs.copyFileSync('www/background.js', `${outDir}/background.js`)
fs.copyFileSync('www/bundle.min.js', `${outDir}/bundle.min.js`)
fs.copyFileSync('www/bundle.min.js.map', `${outDir}/bundle.min.js.map`)
fs.mkdirSync(`${outDir}/icons`)
for (const filename of iconFilenames) {
	fs.copyFileSync(`www/icons/${filename}`, `${outDir}/icons/${filename}`)
}

const manifest = {
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
}

switch (target) {
	case 'chromium':
		manifest.manifest_version = 3
		manifest.web_accessible_resources = [{
			resources: ['bundle.min.js', 'bundle.min.js.map'],
			matches: ['*://*/*'],
		}]
		manifest.background = {
			service_worker: 'background.js',
		}
		manifest.host_permissions = ['*://*/*']
		manifest.permissions = ['scripting']
		break
	case 'firefox':
		manifest.manifest_version = 2
		manifest.permissions = ['*://*/*']
		manifest.web_accessible_resources = ['bundle.min.js']
		break
}

fs.writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest))

execSync(`cd ${outDir} && zip -r ${zipPath} *`)
