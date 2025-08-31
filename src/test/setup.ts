import { execSync } from 'node:child_process'
import { beforeAll } from 'vitest'
import { Prisma } from '@prisma/client'
import { db } from '../services/database'
import { log } from '../utils/logger'

// Set test environment
process.env.NODE_ENV = 'test'

// Set minimal test environment variables to prevent errors
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token'
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-client-id'
process.env.DATABASE_URL = 'postgresql://mplewis@localhost:5432/cowman-test'

beforeAll(async () => {
	try {
		await db.$connect()
		log.info('Test database connected successfully')

		// Reset the database by dropping and recreating all tables
		const tablesToDrop = [
			'ReactionUser',
			'Reaction', 
			'WordUsage',
			'Word',
			'NameVote',
			'NameBattle',
			'RenameHistory',
			'Name',
			'Message',
			'Channel',
			'User',
			'Guild',
			'BackfillState',
			'_prisma_migrations'
		]

		for (const table of tablesToDrop) {
			try {
				await db.$executeRaw`DROP TABLE IF EXISTS ${Prisma.raw(`"${table}"`)} CASCADE;`
			} catch {
				// Ignore errors for non-existent tables
			}
		}

		try {
			execSync('pnpm prisma migrate deploy', {
				env: { ...process.env, NODE_ENV: 'test' },
				stdio: 'pipe',
			})
		} catch (error) {
			// If migration fails because schema is not empty, reset and try again
			if (error instanceof Error && error.message.includes('P3005')) {
				log.warn('Database schema not empty, resetting...')
				execSync('DATABASE_URL="postgresql://mplewis@localhost:5432/cowman-test" pnpm prisma migrate reset --force', {
					env: { ...process.env, NODE_ENV: 'test' },
					stdio: 'pipe',
				})
			} else {
				throw error
			}
		}

		log.info('Test database migrated successfully')
	} catch (error) {
		log.error(error, 'Failed to setup test database')
		throw error
	}
})
