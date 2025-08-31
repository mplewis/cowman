import type { ButtonInteraction } from 'discord.js'
import { db } from '../services/database'
import { log } from '../utils/logger'

/**
 * Handle name battle button interactions
 */
export async function handleNameBattleInteraction(interaction: ButtonInteraction): Promise<void> {
	if (!interaction.guild) {
		return
	}

	if (interaction.customId === 'name_battle_a' || interaction.customId === 'name_battle_b') {
		const client = db

		// Find the battle associated with this message
		const battle = await client.nameBattle.findFirst({
			where: {
				messageId: interaction.message.id,
				active: true,
			},
		})

		if (!battle) {
			await interaction.reply({
				content: 'This name battle is no longer active.',
				ephemeral: true,
			})
			return
		}

		const choice = interaction.customId === 'name_battle_a' ? 'a' : 'b'
		const chosenName = choice === 'a' ? battle.nameA : battle.nameB

		// Ensure user exists in database
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

		// Check if user has already voted
		const existingVote = await client.nameVote.findUnique({
			where: {
				battleId_userId: {
					battleId: battle.id,
					userId: interaction.user.id,
				},
			},
		})

		if (existingVote) {
			if (existingVote.choice === choice) {
				await interaction.reply({
					content: `You have already voted for ${chosenName}`,
					ephemeral: true,
				})
			} else {
				// Update existing vote
				await client.nameVote.update({
					where: { id: existingVote.id },
					data: { choice },
				})

				await interaction.reply({
					content: `Your vote has been changed to ${chosenName}`,
					ephemeral: true,
				})

				log.info(
					{
						battleId: battle.id,
						userId: interaction.user.id,
						choice,
						chosenName,
						action: 'changed',
					},
					'User changed name battle vote'
				)
			}
		} else {
			// Create new vote
			await client.nameVote.create({
				data: {
					battleId: battle.id,
					userId: interaction.user.id,
					choice,
				},
			})

			await interaction.reply({
				content: `You voted for ${chosenName}`,
				ephemeral: true,
			})

			log.info(
				{
					battleId: battle.id,
					userId: interaction.user.id,
					choice,
					chosenName,
					action: 'new',
				},
				'User cast name battle vote'
			)
		}
	}
}
