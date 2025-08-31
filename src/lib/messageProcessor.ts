import type { Message } from 'discord.js'
import { db } from '../services/database'
import { log } from '../utils/logger'
import { extractWords } from '../utils/textProcessor'

/**
 * Process a Discord message and store it with word analysis
 */
export async function processMessage(message: Message): Promise<void> {
	try {
		// Skip bot messages
		if (message.author.bot) {
			return
		}

		const client = db

		// Ensure guild exists
		await client.guild.upsert({
			where: { id: message.guild?.id || 'dm' },
			update: {
				name: message.guild?.name || 'Direct Message',
				updatedAt: new Date(),
			},
			create: {
				id: message.guild?.id || 'dm',
				name: message.guild?.name || 'Direct Message',
			},
		})

		// Ensure channel exists
		if (message.channel) {
			const guildId = message.guild?.id || 'dm'
			await client.channel.upsert({
				where: { id: message.channel.id },
				update: {
					name: 'name' in message.channel ? message.channel.name || 'unknown' : 'unknown',
					type: message.channel.type?.toString() || '1', // 1 = DM channel type
					updatedAt: new Date(),
				},
				create: {
					id: message.channel.id,
					guildId,
					name: 'name' in message.channel ? message.channel.name || 'unknown' : 'unknown',
					type: message.channel.type?.toString() || '1', // 1 = DM channel type
				},
			})
		}

		// Ensure author exists
		await client.user.upsert({
			where: { id: message.author.id },
			update: {
				username: message.author.username,
				displayName: message.author.displayName || message.author.username,
				avatarUrl: message.author.displayAvatarURL(),
				updatedAt: new Date(),
			},
			create: {
				id: message.author.id,
				username: message.author.username,
				displayName: message.author.displayName || message.author.username,
				avatarUrl: message.author.displayAvatarURL(),
			},
		})

		// Store the message
		const attachments =
			message.attachments.size > 0
				? Array.from(message.attachments.values()).map(a => ({ id: a.id, url: a.url, name: a.name, size: a.size }))
				: undefined

		await client.message.upsert({
			where: { id: message.id },
			update: {
				content: message.content,
				timestamp: message.createdAt,
				edited: message.editedAt !== null,
				editedTimestamp: message.editedAt,
				attachments,
				updatedAt: new Date(),
			},
			create: {
				id: message.id,
				channelId: message.channel.id,
				authorId: message.author.id,
				content: message.content,
				timestamp: message.createdAt,
				edited: message.editedAt !== null,
				editedTimestamp: message.editedAt,
				attachments,
			},
		})

		// Process words
		if (message.content.trim().length > 0) {
			const words = extractWords(message.content)

			for (const wordData of words) {
				// Ensure word exists in dictionary
				const wordRecord = await client.word.upsert({
					where: { word: wordData.word },
					update: {},
					create: {
						word: wordData.word,
						originalForm: wordData.originalForm,
					},
				})

				// Track word usage by user in this message
				await client.wordUsage.upsert({
					where: {
						wordId_userId_messageId: {
							wordId: wordRecord.id,
							userId: message.author.id,
							messageId: message.id,
						},
					},
					update: {
						count: { increment: wordData.count },
					},
					create: {
						wordId: wordRecord.id,
						userId: message.author.id,
						messageId: message.id,
						count: wordData.count,
					},
				})
			}
		}

		log.debug(
			{
				messageId: message.id,
				authorId: message.author.id,
				guildId: message.guild?.id,
				channelId: message.channel.id,
				wordCount: extractWords(message.content).length,
			},
			'Processed message'
		)
	} catch (error) {
		log.error(
			{
				error,
				messageId: message.id,
				authorId: message.author.id,
				guildId: message.guild?.id,
			},
			'Failed to process message'
		)
	}
}
