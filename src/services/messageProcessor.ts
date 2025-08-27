import type { Message } from 'discord.js'
import { logger } from '../utils/logger.js'
import { extractWords } from '../utils/textProcessor.js'
import { database } from './database.js'

/**
 * Process Discord messages and store them in the database
 */
export class MessageProcessor {
	/**
	 * Process a Discord message and store it with word analysis
	 */
	async processMessage(message: Message): Promise<void> {
		try {
			// Skip bot messages
			if (message.author.bot) {
				return
			}

			const { client } = database

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
			await client.channel.upsert({
				where: { id: message.channel.id },
				update: {
					name: 'name' in message.channel ? message.channel.name || 'Unknown' : 'DM',
					updatedAt: new Date(),
				},
				create: {
					id: message.channel.id,
					guildId: message.guild?.id || 'dm',
					name: 'name' in message.channel ? message.channel.name || 'Unknown' : 'DM',
					type: message.channel.type.toString(),
				},
			})

			// Ensure user exists
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
			await client.message.upsert({
				where: { id: message.id },
				update: {
					content: message.content,
					timestamp: message.createdAt,
					edited: message.editedAt !== null,
					editedTimestamp: message.editedAt,
					attachments: message.attachments.size > 0 ? this.serializeAttachments(message) : null,
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
					attachments: message.attachments.size > 0 ? this.serializeAttachments(message) : null,
				},
			})

			// Process words if there's text content
			if (message.content.trim()) {
				await this.processMessageWords(message)
			}

			logger.debug(
				{
					messageId: message.id,
					channelId: message.channel.id,
					authorId: message.author.id,
					contentLength: message.content.length,
				},
				'Message processed successfully'
			)
		} catch (error) {
			logger.error(
				{
					error,
					messageId: message.id,
					channelId: message.channel.id,
				},
				'Failed to process message'
			)
			throw error
		}
	}

	/**
	 * Process words in a message and store word usage data
	 */
	private async processMessageWords(message: Message): Promise<void> {
		const words = extractWords(message.content)

		for (const { word, originalForm, count } of words) {
			const { client } = database

			// Ensure word exists in dictionary
			await client.word.upsert({
				where: { word },
				update: {
					originalForm, // Update with potentially better original form
				},
				create: {
					word,
					originalForm,
				},
			})

			// Store word usage for this message
			await client.wordUsage.upsert({
				where: {
					wordId_userId_messageId: {
						wordId: word,
						userId: message.author.id,
						messageId: message.id,
					},
				},
				update: {
					count,
				},
				create: {
					wordId: word,
					userId: message.author.id,
					messageId: message.id,
					count,
				},
			})
		}
	}

	/**
	 * Serialize Discord message attachments for storage
	 */
	private serializeAttachments(message: Message): object {
		return Array.from(message.attachments.values()).map(attachment => ({
			id: attachment.id,
			name: attachment.name,
			url: attachment.url,
			size: attachment.size,
			contentType: attachment.contentType,
		}))
	}
}

export const messageProcessor = new MessageProcessor()
