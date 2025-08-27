import natural from 'natural'

export interface WordCount {
	word: string
	originalForm: string
	count: number
}

/**
 * Process text and extract word counts with stemming
 */
export function extractWords(text: string): WordCount[] {
	if (!text.trim()) {
		return []
	}

	const cleanText = text
		.replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
		.replace(/<@!?\d+>/g, '') // Remove user mentions
		.replace(/<#\d+>/g, '') // Remove channel mentions
		.replace(/<:\w+:\d+>/g, '') // Remove custom emojis
		.replace(/:[a-zA-Z0-9_]+:/g, '') // Remove emoji shortcodes
		.replace(/[^\w\s]/g, ' ') // Remove punctuation
		.toLowerCase()
		.trim()

	if (!cleanText) {
		return []
	}

	const words = cleanText.split(/\s+/).filter(word => word.length > 2) // Filter short words
	const wordCounts = new Map<string, { originalForm: string; count: number }>()

	for (const word of words) {
		const stemmed = natural.PorterStemmer.stem(word)

		if (wordCounts.has(stemmed)) {
			const existing = wordCounts.get(stemmed)
			if (existing) {
				existing.count++
				if (word.length < existing.originalForm.length) {
					existing.originalForm = word
				}
			}
		} else {
			wordCounts.set(stemmed, { originalForm: word, count: 1 })
		}
	}

	return Array.from(wordCounts.entries())
		.map(([stemmed, { originalForm, count }]) => ({
			word: stemmed,
			originalForm,
			count,
		}))
		.sort((a, b) => b.count - a.count)
}

/**
 * Normalize text for consistent processing
 */
export function normalizeText(text: string): string {
	return text.toLowerCase().trim()
}
