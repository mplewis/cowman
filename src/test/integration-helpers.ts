import { beforeEach } from 'vitest'
import { db } from '../services/database'
import { TestData } from './discord-mocks'

/**
 * Clean database before each test
 */
export function setupIntegrationTest() {
	beforeEach(async () => {
		// Clean up all tables in dependency order
		await db.reactionUser.deleteMany()
		await db.reaction.deleteMany()
		await db.wordUsage.deleteMany()
		await db.word.deleteMany()
		await db.nameVote.deleteMany()
		await db.nameBattle.deleteMany()
		await db.renameHistory.deleteMany()
		await db.name.deleteMany()
		await db.message.deleteMany()
		await db.channel.deleteMany()
		await db.user.deleteMany()
		await db.guild.deleteMany()
		await db.backfillState.deleteMany()
	})
}

/**
 * Seed basic test data
 */
export async function seedTestData() {
	const guild = TestData.guilds.testGuild()
	const channel = TestData.channels.general()
	const alice = TestData.users.alice()
	const bob = TestData.users.bob()

	// Create guild
	await db.guild.upsert({
		where: { id: guild.id },
		create: {
			id: guild.id,
			name: guild.name,
		},
		update: {
			name: guild.name,
		},
	})

	// Create channel
	await db.channel.upsert({
		where: { id: channel.id },
		create: {
			id: channel.id,
			guildId: guild.id,
			name: channel.name,
			type: '0',
		},
		update: {
			guildId: guild.id,
			name: channel.name,
			type: '0',
		},
	})

	// Create users
	await db.user.upsert({
		where: { id: alice.id },
		create: {
			id: alice.id,
			username: alice.username,
			displayName: alice.displayName,
			avatarUrl: alice.displayAvatarURL(),
		},
		update: {
			username: alice.username,
			displayName: alice.displayName,
			avatarUrl: alice.displayAvatarURL(),
		},
	})

	await db.user.upsert({
		where: { id: bob.id },
		create: {
			id: bob.id,
			username: bob.username,
			displayName: bob.displayName,
			avatarUrl: bob.displayAvatarURL(),
		},
		update: {
			username: bob.username,
			displayName: bob.displayName,
			avatarUrl: bob.displayAvatarURL(),
		},
	})

	return { guild, channel, alice, bob }
}

/**
 * Create test message in database
 */
export async function createTestMessage(
	messageId: string,
	channelId: string,
	authorId: string,
	content: string
) {
	// Ensure user exists first
	const existingUser = await db.user.findUnique({ where: { id: authorId } })
	if (!existingUser) {
		await db.user.create({
			data: {
				id: authorId,
				username: 'testuser',
				displayName: 'Test User',
				avatarUrl: 'https://example.com/avatar.png',
			},
		})
	}

	// Ensure guild exists first
	const existingGuild = await db.guild.findUnique({ where: { id: '500' } })
	if (!existingGuild) {
		await db.guild.create({
			data: {
				id: '500',
				name: 'Test Guild',
			},
		})
	}

	// Ensure channel exists
	const existingChannel = await db.channel.findUnique({ where: { id: channelId } })
	if (!existingChannel) {
		await db.channel.create({
			data: {
				id: channelId,
				guildId: '500', // Default test guild ID
				name: 'test-channel',
				type: '0',
			},
		})
	}

	return await db.message.create({
		data: {
			id: messageId,
			channelId,
			authorId,
			content,
			timestamp: new Date(),
			edited: false,
			editedTimestamp: null,
		},
	})
}

/**
 * Create test name in database
 */
export async function createTestName(guildId: string, name: string, usageCount = 1) {
	// Try to find the guild first, if not found create it
	const existingGuild = await db.guild.findUnique({ where: { id: guildId } })
	if (!existingGuild) {
		await db.guild.create({
			data: {
				id: guildId,
				name: 'Test Guild',
			},
		})
	}

	return await db.name.create({
		data: {
			guildId,
			name,
			usageCount,
			firstUsed: new Date(),
			lastUsed: new Date(),
		},
	})
}

/**
 * Create test name battle in database
 */
export async function createTestNameBattle(
	guildId: string,
	nameA: string,
	nameB: string,
	messageId: string,
	active = true
) {
	// Ensure guild exists first
	const existingGuild = await db.guild.findUnique({ where: { id: guildId } })
	if (!existingGuild) {
		await db.guild.create({
			data: {
				id: guildId,
				name: 'Test Guild',
			},
		})
	}

	return await db.nameBattle.create({
		data: {
			guildId,
			nameA,
			nameB,
			messageId,
			active,
		},
	})
}

/**
 * Assert database state helpers
 */
export const AssertDB = {
	async userExists(userId: string) {
		const user = await db.user.findUnique({ where: { id: userId } })
		expect(user).toBeTruthy()
		return user!
	},

	async messageExists(messageId: string) {
		const message = await db.message.findUnique({ where: { id: messageId } })
		expect(message).toBeTruthy()
		return message!
	},

	async nameExists(guildId: string, name: string) {
		const nameRecord = await db.name.findFirst({
			where: { guildId, name },
		})
		expect(nameRecord).toBeTruthy()
		return nameRecord!
	},

	async renameHistoryExists(targetUserId: string, name: string) {
		const history = await db.renameHistory.findFirst({
			where: { targetUserId, name: { name } },
			include: { name: true },
		})
		expect(history).toBeTruthy()
		return history!
	},

	async nameBattleExists(messageId: string) {
		const battle = await db.nameBattle.findFirst({
			where: { messageId },
		})
		expect(battle).toBeTruthy()
		return battle!
	},

	async nameVoteExists(battleId: string, userId: string, choice: 'a' | 'b') {
		const vote = await db.nameVote.findFirst({
			where: { battleId, userId, choice },
		})
		expect(vote).toBeTruthy()
		return vote!
	},

	async reactionExists(messageId: string, emoji: string) {
		const reaction = await db.reaction.findFirst({
			where: { messageId, emoji },
		})
		expect(reaction).toBeTruthy()
		return reaction!
	},

	async reactionUserExists(reactionId: string, userId: string) {
		const reactionUser = await db.reactionUser.findFirst({
			where: { reactionId, userId },
		})
		expect(reactionUser).toBeTruthy()
		return reactionUser!
	},

	async wordUsageExists(userId: string, messageId: string) {
		const usage = await db.wordUsage.findFirst({
			where: { userId, messageId },
		})
		expect(usage).toBeTruthy()
		return usage!
	},
}