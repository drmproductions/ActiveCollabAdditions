const chokidar = require('chokidar')
const esbuild = require('esbuild')
const fs = require('fs')
const ws = require('ws')

let ignoreMetaJsonChanges = false

const options = {
	bundle: true,
	entryPoints: ['./src/index.js'],
	minify: true,
	sourcemap: true,
	target: ['es6'],
}

function readMeta() {
	try {
		return JSON.parse(fs.readFileSync('src/meta.json'))
	}
	catch {}
	return {
		version: '0',
	}
}

function writeMeta(meta) {
	fs.writeFileSync('src/meta.json', JSON.stringify(meta, null, '\t'))
}

async function build() {
	const oldMeta = readMeta()
	const newMeta = { ...oldMeta }
	newMeta.version = (parseInt(newMeta.version) + 1).toString()

	try {
		writeMeta(newMeta)
		await esbuild.build({
			...options,
			outfile: './www/bundle.min.js',
		})
	}
	catch (e) {
		writeMeta(oldMeta)
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

	const wss = new ws.WebSocketServer({ port: 9999 })

	async function update() {
		ignoreMetaJsonChanges = true

		console.log('Building...')

		const oldMeta = readMeta()
		const newMeta = { ...oldMeta }
		newMeta.version = 'DEVELOPMENT'

		writeMeta(newMeta)

		try {
			await esbuild.build({
				...options,
				outfile: './out/bundle.min.js',
			})

			if (isChromiumBuilt) {
				fs.copyFileSync('out/bundle.min.js', 'out/chromium/current/bundle.min.js')
				fs.copyFileSync('out/bundle.min.js.map', 'out/chromium/current/bundle.min.js.map')
			}

			if (isFirefoxBuilt) {
				fs.copyFileSync('out/bundle.min.js', 'out/firefox/current/bundle.min.js')
				fs.copyFileSync('out/bundle.min.js.map', 'out/firefox/current/bundle.min.js.map')
			}
		}
		catch (e) {
			console.error(e)
		}

		writeMeta(oldMeta)

		ignoreMetaJsonChanges = false

		for (const client of wss.clients) {
			if (client.readyState !== ws.WebSocket.OPEN) continue
			client.send('reload')
		}
	}

	let timeout
	chokidar.watch('src').on('all', (event, path) => {
		if (path === 'src/meta.json' && ignoreMetaJsonChanges) {
			return
		}
		console.log(event, path)
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
