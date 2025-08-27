import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js'
import { config } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { messageProcessor } from './messageProcessor.js'
import { reactionProcessor } from './reactionProcessor.js'

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
			logger.info(`Bot is ready! Logged in as ${readyClient.user.tag}`)

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
				logger.error(error, 'Failed to process message create event')
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
				logger.error(error, 'Failed to process message update event')
			}
		})

		// Reaction events
		this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
			try {
				await reactionProcessor.processReactionAdd(reaction, user)
			} catch (error) {
				logger.error(error, 'Failed to process reaction add event')
			}
		})

		this.client.on(Events.MessageReactionRemove, async (reaction, user) => {
			try {
				await reactionProcessor.processReactionRemove(reaction, user)
			} catch (error) {
				logger.error(error, 'Failed to process reaction remove event')
			}
		})

		// Error handling
		this.client.on(Events.Error, error => {
			logger.error(error, 'Discord client error')
		})

		this.client.on(Events.Warn, warning => {
			logger.warn(warning, 'Discord client warning')
		})

		this.client.on(Events.Debug, debug => {
			logger.debug(debug, 'Discord client debug')
		})
	}

	async connect(): Promise<void> {
		try {
			await this.client.login(config.discordToken)
			logger.info('Discord bot logged in successfully')
		} catch (error) {
			logger.error(error, 'Failed to log in to Discord')
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			this.client.destroy()
			logger.info('Discord bot disconnected')
		} catch (error) {
			logger.error(error, 'Failed to disconnect from Discord')
			throw error
		}
	}
}

export const discordService = new DiscordService()
