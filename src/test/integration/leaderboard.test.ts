import { describe, it, expect } from 'vitest'
import { executeCommand } from '../../lib/commandHandler'
import { getNameBattleStats } from '../../lib/nameBattleService'
import { getDisplayNames, getNameStats } from '../../lib/nameService'
import { createMockCommandInteraction, TestData } from '../discord-mocks'
import { setupIntegrationTest, seedTestData, createTestMessage, createTestName } from '../integration-helpers'
import { db } from '../../services/database'
import '../../commands/leaderboard'

/**
 * Integration tests for leaderboard functionality
 * Tests all leaderboard types: names, best-names, words, reactions
 */
describe('Leaderboard Integration', () => {
	setupIntegrationTest()

	describe('popular names leaderboard', () => {
		it('displays names ordered by usage count', async () => {
			const { guild, alice } = await seedTestData()

			// Create names with different usage counts
			await createTestName(guild.id, 'SuperPopular', 15)
			await createTestName(guild.id, 'KindaPopular', 8)
			await createTestName(guild.id, 'NotPopular', 2)

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('names'),
					getInteger: vi.fn().mockReturnValue(null), // Default limit
				},
			})

			await executeCommand(interaction)

			// Should return embed with names in order
			expect(interaction.editReply).toHaveBeenCalledWith({
				embeds: expect.arrayContaining([
					expect.objectContaining({
						data: expect.objectContaining({
							title: 'Popular Names Leaderboard',
							description: expect.stringContaining('SuperPopular') &&
										expect.stringContaining('15 wins') &&
										expect.stringContaining('KindaPopular') &&
										expect.stringContaining('8 wins') &&
										expect.stringContaining('NotPopular') &&
										expect.stringContaining('2 wins'),
						}),
					}),
				]),
			})
		})

		it('handles custom limit parameter', async () => {
			const { guild, alice } = await seedTestData()

			// Create more names than limit
			for (let i = 1; i <= 15; i++) {
				await createTestName(guild.id, `Name${i}`, 20 - i)
			}

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('names'),
					getInteger: vi.fn().mockReturnValue(5), // Limit to 5
				},
			})

			await executeCommand(interaction)

			// Should only show top 5
			const call = interaction.editReply.mock.calls[0][0] as any
			const description = call.embeds[0].data.description
			
			// Should contain first 5 names
			expect(description).toContain('Name1')
			expect(description).toContain('Name5')
			
			// Should not contain 6th name
			expect(description).not.toContain('Name6')
		})

		it('handles empty name catalog', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('names'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'No names found in the catalog.',
			})
		})
	})

	describe('best names leaderboard', () => {
		it('displays names ordered by win percentage', async () => {
			const { guild, alice, bob } = await seedTestData()

			// Create names
			await createTestName(guild.id, 'ChampionName', 1)
			await createTestName(guild.id, 'DecentName', 1)
			await createTestName(guild.id, 'LoserName', 1)

			// Create battles with different outcomes
			// ChampionName: 3 wins out of 3 battles (100%)
			const battle1 = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'ChampionName',
					nameB: 'LoserName',
					messageId: 'battle-1',
					active: false,
				},
			})

			// ChampionName wins
			await db.nameVote.createMany({
				data: [
					{ battleId: battle1.id, userId: alice.id, choice: 'a' },
					{ battleId: battle1.id, userId: bob.id, choice: 'a' },
				],
			})

			// DecentName: 1 win out of 2 battles (50%)
			const battle2 = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'DecentName',
					nameB: 'LoserName',
					messageId: 'battle-2',
					active: false,
				},
			})

			await db.nameVote.create({
				data: { battleId: battle2.id, userId: alice.id, choice: 'a' },
			})

			const battle3 = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'DecentName',
					nameB: 'ChampionName',
					messageId: 'battle-3',
					active: false,
				},
			})

			// ChampionName wins again
			await db.nameVote.create({
				data: { battleId: battle3.id, userId: bob.id, choice: 'b' },
			})

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('best-names'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			// Should order by win percentage: ChampionName (100%) > DecentName (50%) > LoserName (0%)
			const call = interaction.editReply.mock.calls[0][0] as any
			const description = call.embeds[0].data.description

			expect(description).toMatch(/1\.\s*\*\*ChampionName\*\*.*100\.0%/)
			expect(description).toMatch(/2\.\s*\*\*DecentName\*\*.*50\.0%/)
			expect(description).toMatch(/3\.\s*\*\*LoserName\*\*.*0\.0%/)
		})

		it('handles no battle data', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('best-names'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'No name battle data found.',
			})
		})
	})

	describe('word usage leaderboard', () => {
		it('displays users ordered by word count', async () => {
			const { guild, channel, alice, bob } = await seedTestData()
			const charlie = TestData.users.charlie()
			
			await db.user.create({
				data: {
					id: charlie.id,
					username: charlie.username,
					displayName: charlie.displayName,
					avatarUrl: charlie.displayAvatarURL(),
				},
			})

			// Create messages and word usage
			const msg1 = await createTestMessage('word-msg-1', channel.id, alice.id, 'test message')
			const msg2 = await createTestMessage('word-msg-2', channel.id, bob.id, 'another test')
			const msg3 = await createTestMessage('word-msg-3', channel.id, charlie.id, 'short')

			// Create words
			const word1 = await db.word.create({ data: { word: 'test', originalForm: 'test' } })
			const word2 = await db.word.create({ data: { word: 'messag', originalForm: 'message' } })
			const word3 = await db.word.create({ data: { word: 'anoth', originalForm: 'another' } })
			const word4 = await db.word.create({ data: { word: 'short', originalForm: 'short' } })

			// Alice: 2 words total (test, message)
			await db.wordUsage.createMany({
				data: [
					{ wordId: word1.id, userId: alice.id, messageId: msg1.id, count: 1 },
					{ wordId: word2.id, userId: alice.id, messageId: msg1.id, count: 1 },
				],
			})

			// Bob: 2 words total (another, test)
			await db.wordUsage.createMany({
				data: [
					{ wordId: word3.id, userId: bob.id, messageId: msg2.id, count: 1 },
					{ wordId: word1.id, userId: bob.id, messageId: msg2.id, count: 1 },
				],
			})

			// Charlie: 1 word total (short)
			await db.wordUsage.create({
				data: { wordId: word4.id, userId: charlie.id, messageId: msg3.id, count: 1 },
			})

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('words'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			const call = interaction.editReply.mock.calls[0][0] as any
			const description = call.embeds[0].data.description

			// Should show users in order of word count (Alice/Bob tied at 2, Charlie at 1)
			expect(description).toContain('2 words')
			expect(description).toContain('1 words')
		})

		it('handles no word usage data', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('words'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'No word usage data found.',
			})
		})
	})

	describe('reaction leaderboard', () => {
		it('displays messages ordered by reaction count', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			// Create messages
			const msg1 = await createTestMessage('react-msg-1', channel.id, alice.id, 'Very popular message')
			const msg2 = await createTestMessage('react-msg-2', channel.id, bob.id, 'Somewhat popular')
			const msg3 = await createTestMessage('react-msg-3', channel.id, alice.id, 'Unpopular')

			// Create reactions with different counts
			await db.reaction.createMany({
				data: [
					{ messageId: msg1.id, emoji: '👍', emojiName: '👍', isCustom: false, count: 15 },
					{ messageId: msg1.id, emoji: '❤️', emojiName: '❤️', isCustom: false, count: 10 },
					{ messageId: msg2.id, emoji: '👍', emojiName: '👍', isCustom: false, count: 8 },
					{ messageId: msg3.id, emoji: '👍', emojiName: '👍', isCustom: false, count: 2 },
				],
			})

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('reactions'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			const call = interaction.editReply.mock.calls[0][0] as any
			const description = call.embeds[0].data.description

			// Should order by total reactions: msg1 (25), msg2 (8), msg3 (2)
			expect(description).toMatch(/1\..*25 reactions/)
			expect(description).toMatch(/2\..*8 reactions/)
			expect(description).toMatch(/3\..*2 reactions/)

			// Should include message content snippets
			expect(description).toContain('Very popular message')
			expect(description).toContain('Somewhat popular')
		})

		it('truncates long message content', async () => {
			const { guild, channel, alice } = await seedTestData()

			const longContent = 'A'.repeat(100) // 100 characters
			const msg = await createTestMessage('long-msg-1', channel.id, alice.id, longContent)

			await db.reaction.create({
				data: { messageId: msg.id, emoji: '👍', emojiName: '👍', isCustom: false, count: 5 },
			})

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('reactions'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			const call = interaction.editReply.mock.calls[0][0] as any
			const description = call.embeds[0].data.description

			// Should truncate and add ellipsis
			expect(description).toContain('A'.repeat(50) + '...')
		})

		it('handles no reaction data', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('reactions'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'No reaction data found.',
			})
		})
	})

	describe('lib function integration', () => {
		it('getNameStats returns correctly ordered names', async () => {
			const { guild } = await seedTestData()

			await createTestName(guild.id, 'First', 10)
			await createTestName(guild.id, 'Second', 8)
			await createTestName(guild.id, 'Third', 6)

			const stats = await getNameStats(2) // Limit to 2

			expect(stats).toHaveLength(2)
			expect(stats[0].name).toBe('First')
			expect(stats[0].usageCount).toBe(10)
			expect(stats[1].name).toBe('Second')
			expect(stats[1].usageCount).toBe(8)
		})

		it('getDisplayNames returns correct mapping', async () => {
			const { alice, bob } = await seedTestData()

			// Set custom name for alice
			await db.user.update({
				where: { id: alice.id },
				data: { customName: 'AliceCustom' },
			})

			const displayNames = await getDisplayNames([alice.id, bob.id])

			expect(displayNames.get(alice.id)).toBe('AliceCustom')
			expect(displayNames.get(bob.id)).toBe(bob.displayName)
		})

		it('getNameBattleStats calculates win percentages correctly', async () => {
			const { guild } = await seedTestData()

			// Create battle where NameA wins 2-1
			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'Winner',
					nameB: 'Loser',
					messageId: 'stats-battle',
					active: false,
				},
			})

			await db.nameVote.createMany({
				data: [
					{ battleId: battle.id, userId: '1', choice: 'a' },
					{ battleId: battle.id, userId: '2', choice: 'a' },
					{ battleId: battle.id, userId: '3', choice: 'b' },
				],
			})

			const stats = await getNameBattleStats(guild.id, 10)

			expect(stats).toHaveLength(2)
			
			const winnerStats = stats.find(s => s.name === 'Winner')
			const loserStats = stats.find(s => s.name === 'Loser')

			expect(winnerStats?.wins).toBe(1)
			expect(winnerStats?.battles).toBe(1)
			expect(winnerStats?.winPercentage).toBe(100)
			expect(winnerStats?.totalVotes).toBe(3)

			expect(loserStats?.wins).toBe(0)
			expect(loserStats?.battles).toBe(1)
			expect(loserStats?.winPercentage).toBe(0)
		})
	})

	describe('error handling', () => {
		it('handles invalid leaderboard type', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('invalid-type'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'Invalid leaderboard type.',
			})
		})

		it('handles non-guild context gracefully', async () => {
			const alice = TestData.users.alice()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild: null, // DM context
				options: {
					getString: vi.fn().mockReturnValue('best-names'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			await executeCommand(interaction)

			expect(interaction.editReply).toHaveBeenCalledWith({
				content: 'This command can only be used in servers.',
			})
		})

		it('handles database errors gracefully', async () => {
			const { guild, alice } = await seedTestData()

			// Mock database error by closing connection temporarily
			await db.$disconnect()

			const interaction = createMockCommandInteraction({
				commandName: 'leaderboard',
				user: alice,
				guild,
				options: {
					getString: vi.fn().mockReturnValue('names'),
					getInteger: vi.fn().mockReturnValue(null),
				},
			})

			// Should handle error gracefully
			await expect(executeCommand(interaction)).resolves.not.toThrow()

			// Reconnect for cleanup
			await db.$connect()
		})
	})
})