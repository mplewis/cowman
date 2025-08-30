import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import { database } from '../services/database'
import { log } from '../utils/logger'
import { commandHandler } from './commandHandler'

const renameCommand = {
	data: new SlashCommandBuilder()
		.setName('rename')
		.setDescription('Set a custom nickname for a user')
		.addUserOption(option =>
			option.setName('user').setDescription('The user to rename').setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('The new custom name')
				.setRequired(true)
				.setMaxLength(50)
		) as SlashCommandBuilder,

	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply({
				content: 'This command can only be used in servers.',
				ephemeral: true,
			})
			return
		}

		const targetUser = interaction.options.getUser('user', true)
		const newName = interaction.options.getString('name', true).trim()

		// Validate name
		if (newName.length < 2) {
			await interaction.reply({
				content: 'Name must be at least 2 characters long.',
				ephemeral: true,
			})
			return
		}

		if (newName.length > 50) {
			await interaction.reply({
				content: 'Name must be 50 characters or less.',
				ephemeral: true,
			})
			return
		}

		// Check for inappropriate content (basic check)
		const inappropriatePatterns = /(?:discord|@everyone|@here|```|\||<@|<#|https?:\/\/)/i
		if (inappropriatePatterns.test(newName)) {
			await interaction.reply({
				content: 'Name contains inappropriate content or Discord formatting.',
				ephemeral: true,
			})
			return
		}

		try {
			const { client } = database

			// Ensure guild exists in database
			await client.guild.upsert({
				where: { id: interaction.guild.id },
				update: {
					name: interaction.guild.name,
					updatedAt: new Date(),
				},
				create: {
					id: interaction.guild.id,
					name: interaction.guild.name,
				},
			})

			// Ensure target user exists in database
			await client.user.upsert({
				where: { id: targetUser.id },
				update: {
					username: targetUser.username,
					displayName: targetUser.displayName || targetUser.username,
					avatarUrl: targetUser.displayAvatarURL(),
					updatedAt: new Date(),
				},
				create: {
					id: targetUser.id,
					username: targetUser.username,
					displayName: targetUser.displayName || targetUser.username,
					avatarUrl: targetUser.displayAvatarURL(),
				},
			})

			// Get current custom name if any
			const currentUser = await client.user.findUnique({
				where: { id: targetUser.id },
			})

			const previousName = currentUser?.customName || targetUser.displayName

			// First try to change Discord nickname
			const member = await interaction.guild.members.fetch(targetUser.id)
			await member.setNickname(newName)

			// Only if Discord rename succeeds, save to database
			// Update user with new custom name
			await client.user.update({
				where: { id: targetUser.id },
				data: {
					customName: newName,
					updatedAt: new Date(),
				},
			})

			// Create name entry for catalog
			const nameRecord = await client.name.upsert({
				where: {
					guildId_name: {
						guildId: interaction.guild.id,
						name: newName,
					},
				},
				update: {
					usageCount: { increment: 1 },
					lastUsed: new Date(),
				},
				create: {
					guildId: interaction.guild.id,
					name: newName,
					usageCount: 1,
					firstUsed: new Date(),
					lastUsed: new Date(),
				},
			})

			// Ensure renaming user exists in database
			await client.user.upsert({
				where: { id: interaction.user.id },
				update: {
					username: interaction.user.username,
					displayName: interaction.user.displayName || interaction.user.username,
					avatarUrl: interaction.user.displayAvatarURL(),
					updatedAt: new Date(),
				},
				create: {
					id: interaction.user.id,
					username: interaction.user.username,
					displayName: interaction.user.displayName || interaction.user.username,
					avatarUrl: interaction.user.displayAvatarURL(),
				},
			})

			// Log rename history
			await client.renameHistory.create({
				data: {
					targetUser: {
						connect: { id: targetUser.id },
					},
					renamedBy: {
						connect: { id: interaction.user.id },
					},
					name: {
						connect: { id: nameRecord.id },
					},
					previousName,
					guild: {
						connect: { id: interaction.guild.id },
					},
					channelId: interaction.channel?.id || 'unknown',
					messageId: interaction.id,
				},
			})

			await interaction.reply({
				content: `Renamed ${targetUser.username} to ${newName}`,
			})

			log.info(
				{
					targetUserId: targetUser.id,
					newName,
					previousName,
					renamedBy: interaction.user.id,
					guildId: interaction.guild.id,
				},
				'User renamed successfully'
			)
		} catch (error) {
			log.error(
				{
					error,
					targetUserId: targetUser.id,
					newName,
					userId: interaction.user.id,
				},
				'Failed to rename user'
			)
			throw error
		}
	},
}

// Register the command
commandHandler.addCommand(renameCommand)
