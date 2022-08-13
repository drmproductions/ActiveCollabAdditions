const fs = require('fs')
const { execSync } = require('child_process')

const target = process.argv[2]

if (!['chromium', 'firefox'].includes(target)) {
	throw new Error(`Invalid target ${target}.`)
}

const version = fs.readFileSync('www/version').toString()
const outDir = `${process.cwd()}/out/${target}/current`
const iconFilenames = fs.readdirSync(`www/icons`).filter(x => x.endsWith('.png'))

execSync(`rm -rf ${outDir}`)
try { fs.mkdirSync('out') } catch {}
try { fs.mkdirSync(`out/${target}`) } catch {}
try { fs.mkdirSync(outDir) } catch {}

fs.copyFileSync('www/inject.js', `${outDir}/inject.js`)
fs.copyFileSync('www/bundle.js', `${outDir}/bundle.js`)
fs.mkdirSync(`${outDir}/icons`)
for (const filename of iconFilenames) {
	fs.copyFileSync(`www/icons/${filename}`, `${outDir}/icons/${filename}`)
}

const manifest = {
	author: 'DRM Productions',
	homepage_url: 'https://drminc.com',
	name: 'ActiveCollabAdditions',
	version,

	description: [
		'Provides instant access to timers on any ActiveCollab page that lists tasks.',
		'Refactored to use modern web technologies.',
		'Along with some other additions.',
	].join(' '),

	icons: iconFilenames.reduce((obj, filename) => {
		const key = filename.split('.')[0]
		obj[key] = `icons/${filename}`
		return obj
	}, {}),

	content_scripts: [{
		matches: ['*://*/*'],
		js: ['inject.js'],
		run_at: 'document_end',
	}],
}

switch (target) {
	case 'chromium':
		manifest.manifest_version = 3
		manifest.web_accessible_resources = [{
			resources: ['bundle.js'],
			matches: ['*://*/*'],
		}]
		break
	case 'firefox':
		manifest.manifest_version = 2
		manifest.permissions = ['*://*/*']
		manifest.web_accessible_resources = ['bundle.js']
		break
}

fs.writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest))
