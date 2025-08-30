import { ActivityType, type ButtonInteraction, Client, Events, GatewayIntentBits } from 'discord.js'
import { commandHandler } from '../commands/commandHandler'
import { config } from '../utils/env'
import { log } from '../utils/logger'
import { database } from './database'
import { messageProcessor } from './messageProcessor'
import { reactionProcessor } from './reactionProcessor'

// Import commands to register them
import '../commands/rename'
import '../commands/leaderboard'
import '../commands/nameBattle'
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

		// Interaction handling (slash commands and button interactions)
		this.client.on(Events.InteractionCreate, async interaction => {
			if (interaction.isChatInputCommand()) {
				try {
					await commandHandler.executeCommand(interaction)
				} catch (error) {
					log.error(error, 'Failed to handle slash command interaction')
				}
			} else if (interaction.isButton()) {
				try {
					await this.handleButtonInteraction(interaction)
				} catch (error) {
					log.error(error, 'Failed to handle button interaction')
				}
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

	private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
		if (!interaction.guild) {
			return
		}

		if (interaction.customId === 'name_battle_a' || interaction.customId === 'name_battle_b') {
			const { client } = database

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
