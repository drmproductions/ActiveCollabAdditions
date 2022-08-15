const chokidar = require('chokidar')
const esbuild = require('esbuild')
const fs = require('fs')

const options = {
	bundle: true,
	entryPoints: ['./src/index.js'],
	target: ['es6'],
}

async function build() {
	const oldVersion = parseInt(fs.readFileSync('www/version').toString())
	const newVersion = oldVersion + 1

	const oldBuildInfo = fs.readFileSync('src/buildinfo.js')

	fs.writeFileSync('src/buildinfo.js', [
		`export const VERSION = ${newVersion}`,
	].join('\n'))

	try {
		await esbuild.build({
			...options,
			minify: true,
			outfile: './www/bundle.js',
		})
		fs.writeFileSync('www/version', newVersion.toString())
	}
	catch (e) {
		fs.writeFileSync('src/buildinfo.js', oldBuildInfo)
		throw e
	}
}

// TODO add hot reload support using websockets
function watch() {
	const isChromiumBuilt = fs.existsSync('out/chromium/current')
	const isFirefoxBuilt = fs.existsSync('out/firefox/current')

	if (!isChromiumBuilt && !isFirefoxBuilt) {
		throw new Error(`Please run "./scripts/build.sh build" and "./scripts/pack.sh chromium|firefox" once before running watch.`)
	}

	async function update() {
		console.log('Building...')

		const oldBuildInfo = fs.readFileSync('src/buildinfo.js')

		fs.writeFileSync('src/buildinfo.js', [
			`export const VERSION = -1`,
		].join('\n'))

		await esbuild.build({
			...options,
			outfile: './out/bundle.js',
		})

		fs.writeFileSync('src/buildinfo.js', oldBuildInfo)

		if (isChromiumBuilt) {
			fs.copyFileSync('out/bundle.js', 'out/chromium/current/bundle.js')
		}

		if (isFirefoxBuilt) {
			fs.copyFileSync('out/bundle.js', 'out/firefox/current/bundle.js')
		}
	}

	let timeout
	chokidar.watch('src').on('all', (event, path) => {
		if (path === 'src/buildinfo.js') return
		clearTimeout(timeout)
		timeout = setTimeout(update, 200)
	})
}

const action = process.argv[2]
switch (process.argv[2]) {
	case 'build':
		build()
		break
	case 'watch':
		watch()
		break
	default:
		throw new Error(`Invalid action ${action}.`)
}
