#!/usr/bin/env tsx

import { REST, Routes } from 'discord.js'
import { getCommandsData } from '../lib/commandHandler'
import { config } from '../utils/env'
import { log } from '../utils/logger'

// Import all commands to register them
import './rename'
import './leaderboard'
import './nameBattle'

/**
 * Deploy slash commands to Discord
 */
export async function deployCommands(): Promise<void> {
	const commands = getCommandsData()
	const rest = new REST().setToken(config.discordToken)

	try {
		log.info({ commandCount: commands.length }, 'Started refreshing application (/) commands')

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = (await rest.put(Routes.applicationCommands(config.discordClientId), {
			body: commands,
		})) as unknown[]

		log.info({ commandCount: data.length }, 'Successfully reloaded application (/) commands')
	} catch (error) {
		log.error(error, 'Failed to deploy commands')
		process.exit(1)
	}
}
