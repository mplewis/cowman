import { logger } from './logger.js'

interface Config {
  discordToken: string
  discordClientId: string
  databaseUrl: string
  nodeEnv: string
  logLevel: string
}

function validateEnv(): Config {
  const requiredVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DATABASE_URL']
  const missing = requiredVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }

  return {
    discordToken: process.env.DISCORD_TOKEN!,
    discordClientId: process.env.DISCORD_CLIENT_ID!,
    databaseUrl: process.env.DATABASE_URL!,
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
}

export const config = validateEnv()