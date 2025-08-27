import { describe, expect, it } from 'vitest'

// We need to test the mustEnv function in isolation
// Since env.ts calls validateEnv immediately on import, we'll test the logic directly

function mustEnv(key: string): string {
	const value = process.env[key]
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`)
	}
	return value
}

describe('mustEnv function', () => {
	it('returns environment variable value when present', () => {
		process.env.TEST_VAR = 'test-value'
		expect(mustEnv('TEST_VAR')).toBe('test-value')
	})

	it('throws error when environment variable is missing', () => {
		delete process.env.MISSING_VAR
		expect(() => mustEnv('MISSING_VAR')).toThrow(
			'Missing required environment variable: MISSING_VAR'
		)
	})

	it('throws error when environment variable is empty string', () => {
		process.env.EMPTY_VAR = ''
		expect(() => mustEnv('EMPTY_VAR')).toThrow('Missing required environment variable: EMPTY_VAR')
	})
})
