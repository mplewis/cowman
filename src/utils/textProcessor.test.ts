import { describe, expect, it } from 'vitest'
import { extractWords, normalizeText } from './textProcessor.js'

describe('textProcessor', () => {
	describe('extractWords', () => {
		it('extracts and stems words correctly', () => {
			const text = 'Running runners run quickly'
			const result = extractWords(text)

			expect(result).toEqual([
				{ word: 'run', originalForm: 'run', count: 2 },
				{ word: 'runner', originalForm: 'runners', count: 1 },
				{ word: 'quickli', originalForm: 'quickly', count: 1 },
			])
		})

		it('filters out short words', () => {
			const text = 'I am a big fan of this'
			const result = extractWords(text)

			const words = result.map(w => w.word).sort()
			expect(words).toEqual(['big', 'fan', 'thi'])
		})

		it('removes Discord-specific content', () => {
			const text =
				'Hello <@123456789> check out https://example.com and <#987654321> :custom_emoji:'
			const result = extractWords(text)

			const words = result.map(w => w.word).sort()
			expect(words).toEqual(['and', 'check', 'hello', 'out'])
		})

		it('handles empty or whitespace text', () => {
			expect(extractWords('')).toEqual([])
			expect(extractWords('   ')).toEqual([])
			expect(extractWords('!@#$%^&*()')).toEqual([])
		})

		it('preserves shortest original form', () => {
			const text = 'running run runner runs'
			const result = extractWords(text)

			expect(result).toEqual([
				{ word: 'run', originalForm: 'run', count: 3 },
				{ word: 'runner', originalForm: 'runner', count: 1 },
			])
		})
	})

	describe('normalizeText', () => {
		it('converts to lowercase and trims', () => {
			expect(normalizeText('  HELLO WORLD  ')).toBe('hello world')
		})

		it('handles empty strings', () => {
			expect(normalizeText('')).toBe('')
			expect(normalizeText('   ')).toBe('')
		})
	})
})
