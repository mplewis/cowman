import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./src/test/setup.ts'],
		// Run integration tests sequentially to avoid database conflicts
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
	},
})
