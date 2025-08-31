import type { CacheType, ChatInputCommandInteraction } from 'discord.js'
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js'
import { addCommand } from '../lib/commandHandler'
import { db } from '../services/database'
import { log } from '../utils/logger'

/**
 * Create and manage name battles (A vs B voting competitions)
 */
const nameBattleCommand = {
	data: new SlashCommandBuilder()
		.setName('name-battle')
		.setDescription(
			'Start a name battle with two randomly selected names from the database'
		) as SlashCommandBuilder,

	async execute(interaction: ChatInputCommandInteraction<CacheType>) {
		if (!interaction.guild) {
			await interaction.reply({
				content: 'This command can only be used in servers.',
				ephemeral: true,
			})
			return
		}

		const client = db

		// Get all names from this guild
		const allNames = await client.name.findMany({
			where: { guildId: interaction.guild.id },
			orderBy: { usageCount: 'desc' },
		})

		if (allNames.length < 2) {
			await interaction.reply({
				content:
					'Not enough names in the database. At least 2 names are needed for a battle. Try using /rename to create some names first!',
				ephemeral: true,
			})
			return
		}

		// Select two random names
		const shuffled = allNames.sort(() => 0.5 - Math.random())
		const nameA = shuffled[0].name
		const nameB = shuffled[1].name

		try {
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

			// Create the embed for the name battle
			const embed = new EmbedBuilder()
				.setTitle('Name Battle')
				.setDescription(
					`Which nickname is better?\n\n**Option A:** ${nameA}\n**Option B:** ${nameB}`
				)
				.setColor(0x5865f2)
				.setTimestamp()

			// Create the buttons
			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`name_battle_a`)
					.setLabel(nameA)
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId(`name_battle_b`)
					.setLabel(nameB)
					.setStyle(ButtonStyle.Secondary)
			)

			// Send the battle message
			await interaction.reply({
				embeds: [embed],
				components: [buttons],
			})

			// Get the message ID from the reply
			const reply = await interaction.fetchReply()

			// Save the battle to the database
			const battle = await client.nameBattle.create({
				data: {
					guildId: interaction.guild.id,
					nameA: nameA,
					nameB: nameB,
					messageId: reply.id,
					active: true,
				},
			})

			log.info(
				{
					battleId: battle.id,
					nameA,
					nameB,
					guildId: interaction.guild.id,
					createdBy: interaction.user.id,
				},
				'Name battle created'
			)
		} catch (error) {
			log.error(
				{
					error,
					nameA,
					nameB,
					guildId: interaction.guild.id,
					userId: interaction.user.id,
				},
				'Failed to create name battle'
			)
			throw error
		}
	},
}

// Register the command
addCommand(nameBattleCommand)
