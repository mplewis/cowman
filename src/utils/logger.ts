import pino from 'pino'

const log = pino({
	level: process.env.LOG_LEVEL || 'info',
	...((process.stdout.isTTY || process.env.NODE_ENV === 'test') && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'yyyy-mm-dd HH:MM:ss',
				ignore: 'pid,hostname',
				singleLine: false,
				hideObject: false,
			},
		},
	}),
})

export { log }
