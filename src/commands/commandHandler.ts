import type { CacheType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { Collection } from 'discord.js'
import { log } from '../utils/logger'

export interface Command {
	data: SlashCommandBuilder
	execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>
}

/**
 * Handle slash command registration and execution
 */
export class CommandHandler {
	private commands: Collection<string, Command>

	constructor() {
		this.commands = new Collection()
	}

	/**
	 * Register a command
	 */
	addCommand(command: Command): void {
		this.commands.set(command.data.name, command)
		log.debug({ commandName: command.data.name }, 'Registered command')
	}

	/**
	 * Get all registered commands for deployment
	 */
	getCommandsData(): unknown[] {
		return this.commands.map(command => command.data.toJSON())
	}

	/**
	 * Execute a slash command
	 */
	async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
		const command = this.commands.get(interaction.commandName)

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

			const errorMessage = 'There was an error while executing this command!'

			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: errorMessage, ephemeral: true })
			} else {
				await interaction.reply({ content: errorMessage, ephemeral: true })
			}
		}
	}
}

export const commandHandler = new CommandHandler()
