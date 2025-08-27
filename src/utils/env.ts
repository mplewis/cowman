import { logger } from './logger.js'

interface Config {
	discordToken: string
	discordClientId: string
	databaseUrl: string
	nodeEnv: string
	logLevel: string
}

function mustEnv(key: string): string {
	const value = process.env[key]
	if (!value) {
		logger.error(`Missing required environment variable: ${key}`)
		throw new Error(`Missing required environment variable: ${key}`)
	}
	return value
}

function validateEnv(): Config {
	const nodeEnv = process.env.NODE_ENV || 'development'
	const isTest = nodeEnv === 'test'

	return {
		discordToken: mustEnv('DISCORD_TOKEN'),
		discordClientId: mustEnv('DISCORD_CLIENT_ID'),
		databaseUrl: isTest ? mustEnv('DATABASE_TEST_URL') : mustEnv('DATABASE_URL'),
		nodeEnv,
		logLevel: process.env.LOG_LEVEL || 'info',
	}
}

export const config = validateEnv()
