import { PrismaClient } from '../generated/prisma/index'
import { log } from '../utils/logger'

/**
 * Database client instance
 */
export const db = new PrismaClient()

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
	try {
		await db.$connect()
		log.info('Connected to database')
	} catch (error) {
		log.error(error, 'Failed to connect to database')
		throw error
	}
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
	try {
		await db.$disconnect()
		log.info('Disconnected from database')
	} catch (error) {
		log.error(error, 'Failed to disconnect from database')
		throw error
	}
}
