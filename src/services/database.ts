import { PrismaClient } from '../generated/prisma/index'
import { log } from '../utils/logger'

class DatabaseService {
	private prisma: PrismaClient

	constructor() {
		this.prisma = new PrismaClient()
	}

	async connect(): Promise<void> {
		try {
			await this.prisma.$connect()
			log.info('Connected to database')
		} catch (error) {
			log.error(error, 'Failed to connect to database')
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.prisma.$disconnect()
			log.info('Disconnected from database')
		} catch (error) {
			log.error(error, 'Failed to disconnect from database')
			throw error
		}
	}

	get client(): PrismaClient {
		return this.prisma
	}
}

export const database = new DatabaseService()
export const db = database.client
