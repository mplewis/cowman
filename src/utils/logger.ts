import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined
const isTest = process.env.NODE_ENV === 'test'
const { isTTY } = process.stdout

const pretty = {
	target: 'pino-pretty',
	options: {
		colorize: true,
		translateTime: 'yyyy-mm-dd HH:MM:ss',
		ignore: 'pid,hostname',
		singleLine: false,
		hideObject: false,
	},
}

const tmpFile = {
	target: 'pino/file',
	options: { destination: 'tmp/cowman.log' },
}

const log = pino({
	level: process.env.LOG_LEVEL || 'info',
	...((isTTY || isTest) && {
		transport: isDev ? { targets: [pretty, tmpFile] } : pretty,
	}),
})

export { log }
