import type { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js'
import { db } from '../services/database'
import { log } from '../utils/logger'

/**
 * Get a unique identifier for an emoji
 */
function getEmojiIdentifier(reaction: MessageReaction | PartialMessageReaction): string {
	// For custom emojis, use the ID; for Unicode emojis, use the name
	return reaction.emoji.id || reaction.emoji.name || 'unknown'
}

/**
 * Get the display name for an emoji
 */
function getEmojiName(reaction: MessageReaction | PartialMessageReaction): string {
	return reaction.emoji.name || 'unknown'
}

/**
 * Process a reaction add event
 */
export async function processReactionAdd(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser
): Promise<void> {
	try {
		// Skip bot reactions
		if (user.bot) {
			return
		}

		// Fetch partial data if needed
		if (reaction.partial) {
			reaction = await reaction.fetch()
		}
		if (user.partial) {
			user = await user.fetch()
		}

		const client = db

		// Ensure user exists
		await client.user.upsert({
			where: { id: user.id },
			update: {
				username: user.username,
				displayName: user.displayName || user.username,
				avatarUrl: user.displayAvatarURL(),
				updatedAt: new Date(),
			},
			create: {
				id: user.id,
				username: user.username,
				displayName: user.displayName || user.username,
				avatarUrl: user.displayAvatarURL(),
			},
		})

		const emojiId = getEmojiIdentifier(reaction)
		const emojiName = getEmojiName(reaction)
		const isCustom = reaction.emoji.id !== null

		// Ensure reaction record exists and update count
		await client.reaction.upsert({
			where: {
				messageId_emoji: {
					messageId: reaction.message.id,
					emoji: emojiId,
				},
			},
			update: {
				count: reaction.count || 1,
				updatedAt: new Date(),
			},
			create: {
				messageId: reaction.message.id,
				emoji: emojiId,
				emojiName,
				isCustom,
				count: reaction.count || 1,
			},
		})

		// Add individual user reaction record
		await client.reactionUser.upsert({
			where: {
				reactionId_userId: {
					reactionId: `${reaction.message.id}-${emojiId}`,
					userId: user.id,
				},
			},
			update: {
				createdAt: new Date(), // Update timestamp
			},
			create: {
				reactionId: `${reaction.message.id}-${emojiId}`,
				userId: user.id,
			},
		})

		log.debug(
			{
				messageId: reaction.message.id,
				userId: user.id,
				emoji: emojiName,
				count: reaction.count,
			},
			'Reaction add processed successfully'
		)
	} catch (error) {
		log.error(
			{
				error,
				messageId: reaction.message.id,
				userId: user.id,
			},
			'Failed to process reaction add'
		)
		throw error
	}
}

/**
 * Process a reaction remove event
 */
export async function processReactionRemove(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser
): Promise<void> {
	try {
		// Skip bot reactions
		if (user.bot) {
			return
		}

		// Fetch partial data if needed
		if (reaction.partial) {
			reaction = await reaction.fetch()
		}
		if (user.partial) {
			user = await user.fetch()
		}

		const client = db
		const emojiId = getEmojiIdentifier(reaction)

		// Remove individual user reaction record
		await client.reactionUser.deleteMany({
			where: {
				reactionId: `${reaction.message.id}-${emojiId}`,
				userId: user.id,
			},
		})

		// Update reaction count
		const remainingCount = reaction.count || 0
		if (remainingCount > 0) {
			await client.reaction.update({
				where: {
					messageId_emoji: {
						messageId: reaction.message.id,
						emoji: emojiId,
					},
				},
				data: {
					count: remainingCount,
					updatedAt: new Date(),
				},
			})
		} else {
			// Remove reaction record if no reactions left
			await client.reaction.deleteMany({
				where: {
					messageId: reaction.message.id,
					emoji: emojiId,
				},
			})
		}

		log.debug(
			{
				messageId: reaction.message.id,
				userId: user.id,
				emoji: getEmojiName(reaction),
				remainingCount,
			},
			'Reaction remove processed successfully'
		)
	} catch (error) {
		log.error(
			{
				error,
				messageId: reaction.message.id,
				userId: user.id,
			},
			'Failed to process reaction remove'
		)
		throw error
	}
}
