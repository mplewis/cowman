import type { ChatInputCommandInteraction } from 'discord.js'
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { database } from '../services/database'
import { nameService } from '../services/nameService'
import { log } from '../utils/logger'
import { commandHandler } from './commandHandler'

const leaderboardCommand = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Show various leaderboards')
		.addStringOption(option =>
			option
				.setName('type')
				.setDescription('Type of leaderboard to show')
				.setRequired(true)
				.addChoices(
					{ name: 'Popular Names', value: 'names' },
					{ name: 'Top Word Users', value: 'words' },
					{ name: 'Most Reactions', value: 'reactions' }
				)
		)
		.addIntegerOption(option =>
			option
				.setName('limit')
				.setDescription('Number of entries to show (default: 10)')
				.setMinValue(5)
				.setMaxValue(20)
		) as SlashCommandBuilder,

	async execute(interaction: ChatInputCommandInteraction) {
		const type = interaction.options.getString('type', true)
		const limit = interaction.options.getInteger('limit') || 10

		try {
			await interaction.deferReply()

			switch (type) {
				case 'names':
					await this.showNameLeaderboard(interaction, limit)
					break
				case 'words':
					await this.showWordLeaderboard(interaction, limit)
					break
				case 'reactions':
					await this.showReactionLeaderboard(interaction, limit)
					break
				default:
					await interaction.editReply({ content: 'Invalid leaderboard type.' })
			}
		} catch (error) {
			log.error({ error, type }, 'Failed to show leaderboard')
			throw error
		}
	},

	async showNameLeaderboard(interaction: ChatInputCommandInteraction, limit: number) {
		const names = await nameService.getNameStats(limit)

		if (names.length === 0) {
			await interaction.editReply({ content: 'No names found in the catalog.' })
			return
		}

		const embed = new EmbedBuilder()
			.setTitle('🏆 Popular Names Leaderboard')
			.setDescription('Most used custom names in the server')
			.setColor(0x5865f2)
			.setTimestamp()

		const description = names
			.map((name, index) => `${index + 1}. **${name.name}** - ${name.usageCount} uses`)
			.join('\n')

		embed.setDescription(description)

		await interaction.editReply({ embeds: [embed] })
	},

	async showWordLeaderboard(interaction: ChatInputCommandInteraction, limit: number) {
		const { client } = database

		// Get top word users with their custom names
		const topUsers = await client.wordUsage.groupBy({
			by: ['userId'],
			_sum: {
				count: true,
			},
			orderBy: {
				_sum: {
					count: 'desc',
				},
			},
			take: limit,
		})

		if (topUsers.length === 0) {
			await interaction.editReply({ content: 'No word usage data found.' })
			return
		}

		// Get display names for users
		const userIds = topUsers.map(u => u.userId)
		const displayNames = await nameService.getDisplayNames(userIds)

		const embed = new EmbedBuilder()
			.setTitle('📝 Top Word Users')
			.setDescription('Users who use the most unique words')
			.setColor(0x57f287)
			.setTimestamp()

		const description = topUsers
			.map((user, index) => {
				const displayName = displayNames.get(user.userId) || 'Unknown User'
				const totalWords = user._sum.count || 0
				return `${index + 1}. **${displayName}** - ${totalWords} words`
			})
			.join('\n')

		embed.setDescription(description)

		await interaction.editReply({ embeds: [embed] })
	},

	async showReactionLeaderboard(interaction: ChatInputCommandInteraction, limit: number) {
		const { client } = database

		// Get top reaction receivers with their custom names
		const topMessages = await client.reaction.groupBy({
			by: ['messageId'],
			_sum: {
				count: true,
			},
			orderBy: {
				_sum: {
					count: 'desc',
				},
			},
			take: limit,
		})

		if (topMessages.length === 0) {
			await interaction.editReply({ content: 'No reaction data found.' })
			return
		}

		// Get message details to find authors
		const messageIds = topMessages.map(m => m.messageId)
		const messages = await client.message.findMany({
			where: { id: { in: messageIds } },
			select: { id: true, authorId: true, content: true },
		})

		// Get display names for authors
		const authorIds = messages.map(m => m.authorId)
		const displayNames = await nameService.getDisplayNames(authorIds)

		const embed = new EmbedBuilder()
			.setTitle('⭐ Top Reacted Messages')
			.setDescription('Messages with the most reactions')
			.setColor(0xfee75c)
			.setTimestamp()

		const description = topMessages
			.map((messageData, index) => {
				const message = messages.find(m => m.id === messageData.messageId)
				const authorName = message
					? displayNames.get(message.authorId) || 'Unknown User'
					: 'Unknown User'
				const totalReactions = messageData._sum.count || 0
				const content = message?.content
					? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
					: 'No content'

				return `${index + 1}. **${authorName}** (${totalReactions} reactions)\n   "${content}"`
			})
			.join('\n\n')

		embed.setDescription(description)

		await interaction.editReply({ embeds: [embed] })
	},
}

// Register the command
commandHandler.addCommand(leaderboardCommand)
