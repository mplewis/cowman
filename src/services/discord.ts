import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js'
import { commandHandler } from '../commands/commandHandler'
import { config } from '../utils/env'
import { log } from '../utils/logger'
import { messageProcessor } from './messageProcessor'
import { reactionProcessor } from './reactionProcessor'

// Import commands to register them
import '../commands/rename'
import '../commands/leaderboard'
import { deployCommands } from '../commands/deploy'

class DiscordService {
	public client: Client

	constructor() {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessageReactions,
			],
		})

		this.setupEventHandlers()
	}

	private setupEventHandlers(): void {
		this.client.once(Events.ClientReady, readyClient => {
			log.info({ userTag: readyClient.user.tag }, 'Bot is ready! Logged in')

			// Set bot activity
			readyClient.user.setActivity({
				name: 'Discord messages',
				type: ActivityType.Watching,
			})
		})

		// Message events
		this.client.on(Events.MessageCreate, async message => {
			try {
				await messageProcessor.processMessage(message)
			} catch (error) {
				log.error(error, 'Failed to process message create event')
			}
		})

		this.client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
			try {
				// Process updated message
				if (newMessage.partial) {
					newMessage = await newMessage.fetch()
				}
				await messageProcessor.processMessage(newMessage)
			} catch (error) {
				log.error(error, 'Failed to process message update event')
			}
		})

		// Reaction events
		this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
			try {
				await reactionProcessor.processReactionAdd(reaction, user)
			} catch (error) {
				log.error(error, 'Failed to process reaction add event')
			}
		})

		this.client.on(Events.MessageReactionRemove, async (reaction, user) => {
			try {
				await reactionProcessor.processReactionRemove(reaction, user)
			} catch (error) {
				log.error(error, 'Failed to process reaction remove event')
			}
		})

		// Slash command handling
		this.client.on(Events.InteractionCreate, async interaction => {
			if (!interaction.isChatInputCommand()) {
				return
			}

			try {
				await commandHandler.executeCommand(interaction)
			} catch (error) {
				log.error(error, 'Failed to handle slash command interaction')
			}
		})

		// Error handling
		this.client.on(Events.Error, error => {
			log.error(error, 'Discord client error')
		})

		this.client.on(Events.Warn, warning => {
			log.warn({ warning }, 'Discord client warning')
		})

		this.client.on(Events.Debug, debug => {
			log.debug({ debug }, 'Discord client debug')
		})
	}

	async connect(): Promise<void> {
		try {
			await this.client.login(config.discordToken)
			log.info('Discord bot logged in successfully')
			await deployCommands()
		} catch (error) {
			log.error(error, 'Failed to log in to Discord')
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			this.client.destroy()
			log.info('Discord bot disconnected')
		} catch (error) {
			log.error(error, 'Failed to disconnect from Discord')
			throw error
		}
	}
}

export const discordService = new DiscordService()
