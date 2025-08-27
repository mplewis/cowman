import { afterAll, beforeAll } from 'vitest'

// Set test environment
process.env.NODE_ENV = 'test'

// Set minimal test environment variables to prevent errors
process.env.DISCORD_TOKEN = 'test-token'
process.env.DISCORD_CLIENT_ID = 'test-client-id'
process.env.DATABASE_TEST_URL = 'postgresql://test:test@localhost:5432/test_db'

beforeAll(async () => {
	// Database connection setup can be added here when needed for integration tests
})

afterAll(async () => {
	// Cleanup can be added here when needed
})
