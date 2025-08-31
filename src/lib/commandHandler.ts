import type { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { log } from '../utils/logger'

export interface Command {
	data: SlashCommandBuilder
	execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>
}

/**
 * Map to store registered commands
 */
const commands = new Map<string, Command>()

/**
 * Register a command
 */
export function addCommand(command: Command): void {
	commands.set(command.data.name, command)
	log.debug({ commandName: command.data.name }, 'Registered command')
}

/**
 * Get all registered commands for deployment
 */
export function getCommandsData(): unknown[] {
	return Array.from(commands.values()).map(command => command.data.toJSON())
}

/**
 * Execute a slash command
 */
export async function executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
	const command = commands.get(interaction.commandName)

	if (!command) {
		log.warn({ commandName: interaction.commandName }, 'Unknown command')
		await interaction.reply({
			content: 'I do not recognize this command.',
			ephemeral: true,
		})
		return
	}

	try {
		await command.execute(interaction)
		log.debug(
			{
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild?.id,
			},
			'Command executed successfully'
		)
	} catch (error) {
		log.error(
			{
				error,
				commandName: interaction.commandName,
				userId: interaction.user.id,
				guildId: interaction.guild?.id,
			},
			'Command execution failed'
		)

		// Extract user-friendly error message
		const errorMessages = {
			'Missing Permissions':
				'I don\'t have the required permissions to perform this action. Please check that I have "Manage Nicknames" permission and that my role is higher than the target user\'s role.',
			'Unknown Member': 'User not found in this server.',
			'Unknown User': 'User not found in this server.',
			'Maximum length':
				'The nickname is too long. Discord nicknames must be 32 characters or less.',
		}

		let errorMessage = 'There was an error while executing this command!'

		if (error instanceof Error) {
			const matchedError = Object.keys(errorMessages).find(key => error.message.includes(key))

			if (matchedError) {
				errorMessage = errorMessages[matchedError as keyof typeof errorMessages]
			} else {
				// Include the actual error message for other errors
				errorMessage = `Error: ${error.message}`
			}
		}

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: errorMessage, ephemeral: true })
		} else {
			await interaction.reply({ content: errorMessage, ephemeral: true })
		}
	}
}
