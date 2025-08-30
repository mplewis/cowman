import { PrismaClient } from '../generated/prisma/index'
import { log } from '../utils/logger'

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
			log.debug(
				{
					query: e.query,
					params: e.params,
					duration: e.duration,
				},
				'Database query executed'
			)
		})

		this.prisma.$on('error', e => {
			log.error(e, 'Database error')
		})

		this.prisma.$on('info', e => {
			log.info({ message: e.message }, 'Database info')
		})

		this.prisma.$on('warn', e => {
			log.warn({ message: e.message }, 'Database warning')
		})
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
