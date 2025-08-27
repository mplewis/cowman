import { describe, expect, it } from 'vitest'

describe('Environment configuration', () => {
	it('validates required environment variables are set', () => {
		// These are set by test setup
		expect(process.env.NODE_ENV).toBe('test')
		expect(process.env.DISCORD_TOKEN).toBeDefined()
		expect(process.env.DISCORD_CLIENT_ID).toBeDefined()
		expect(process.env.DATABASE_TEST_URL).toBeDefined()
	})

	it('uses test environment settings', () => {
		// Since we're running in test mode, NODE_ENV is 'test'
		expect(process.env.NODE_ENV).toBe('test')
	})
})
