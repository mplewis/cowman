import { logger } from './utils/logger.js'
import { database } from './services/database.js'
import { discordService } from './services/discord.js'

async function main(): Promise<void> {
  logger.info('Starting Discord bot...')

  try {
    // Connect to database
    await database.connect()

    // Connect to Discord
    await discordService.connect()

    // Setup graceful shutdown
    setupGracefulShutdown()

    logger.info('Bot is running!')
  } catch (error) {
    logger.error(error, 'Failed to start bot')
    process.exit(1)
  }
}

function setupGracefulShutdown(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`)

    try {
      await discordService.disconnect()
      await database.disconnect()
      logger.info('Shutdown complete')
      process.exit(0)
    } catch (error) {
      logger.error(error, 'Error during shutdown')
      process.exit(1)
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('uncaughtException', (error) => {
    logger.error(error, 'Uncaught exception')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error(reason, 'Unhandled rejection')
    process.exit(1)
  })
}

// Start the bot
main().catch((error) => {
  logger.error(error, 'Fatal error in main function')
  process.exit(1)
})