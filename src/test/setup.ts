import { execSync } from 'node:child_process'
import { beforeAll } from 'vitest'
import { db } from '../services/database'
import { log } from '../utils/logger'

// Set test environment
process.env.NODE_ENV = 'test'

// Set minimal test environment variables to prevent errors
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || 'test-token'
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'test-client-id'
process.env.DATABASE_TEST_URL = process.env.DATABASE_TEST_URL || 'postgresql://mplewis@localhost:5432/cowman-test'

beforeAll(async () => {
	try {
		await db.$connect()
		log.info('Test database connected successfully')

		await db.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE;`
		await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS public;`

		execSync('pnpm prisma migrate deploy', {
			env: { ...process.env, NODE_ENV: 'test' },
			stdio: 'pipe',
		})

		log.info('Test database migrated successfully')
	} catch (error) {
		log.error(error, 'Failed to setup test database')
		throw error
	}
})
