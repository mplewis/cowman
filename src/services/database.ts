import { PrismaClient } from '../generated/prisma/index.js'
import { logger } from '../utils/logger.js'

class DatabaseService {
	private prisma: PrismaClient

	constructor() {
		this.prisma = new PrismaClient({
			log: [
				{ emit: 'event', level: 'query' },
				{ emit: 'event', level: 'error' },
				{ emit: 'event', level: 'info' },
				{ emit: 'event', level: 'warn' },
			],
		})

		this.setupLogging()
	}

	private setupLogging(): void {
		this.prisma.$on('query', e => {
			logger.debug(
				{
					query: e.query,
					params: e.params,
					duration: e.duration,
				},
				'Database query executed'
			)
		})

		this.prisma.$on('error', e => {
			logger.error(e, 'Database error')
		})

		this.prisma.$on('info', e => {
			logger.info(e.message, 'Database info')
		})

		this.prisma.$on('warn', e => {
			logger.warn(e.message, 'Database warning')
		})
	}

	async connect(): Promise<void> {
		try {
			await this.prisma.$connect()
			logger.info('Connected to database')
		} catch (error) {
			logger.error(error, 'Failed to connect to database')
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.prisma.$disconnect()
			logger.info('Disconnected from database')
		} catch (error) {
			logger.error(error, 'Failed to disconnect from database')
			throw error
		}
	}

	get client(): PrismaClient {
		return this.prisma
	}
}

export const database = new DatabaseService()
export const db = database.client
