import { database } from './services/database'
import { discordService } from './services/discord'
import { log } from './utils/logger'

function setupGracefulShutdown(): void {
	const shutdown = async (signal: string): Promise<void> => {
		log.info({ signal }, 'Received signal, shutting down gracefully...')

		try {
			await discordService.disconnect()
			await database.disconnect()
			log.info('Shutdown complete')
			process.exit(0)
		} catch (error) {
			log.error(error, 'Error during shutdown')
			process.exit(1)
		}
	}

	process.on('SIGINT', () => shutdown('SIGINT'))
	process.on('SIGTERM', () => shutdown('SIGTERM'))

	process.on('uncaughtException', error => {
		log.error(error, 'Uncaught exception')
	})

	process.on('unhandledRejection', reason => {
		log.error(reason, 'Unhandled rejection')
	})
}

async function main(): Promise<void> {
	log.info('Starting Discord bot...')

	try {
		await database.connect()
		await discordService.connect()
		setupGracefulShutdown()
		log.info('Bot is running!')
	} catch (error) {
		log.error(error, 'Failed to start bot')
		process.exit(1)
	}
}

void main()
