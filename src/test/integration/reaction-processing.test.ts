import { describe, it, expect } from 'vitest'
import { processReactionAdd, processReactionRemove } from '../../lib/reactionProcessor'
import { createMockReaction, createMockMessage, TestData } from '../discord-mocks'
import { setupIntegrationTest, seedTestData, createTestMessage, AssertDB } from '../integration-helpers'
import { db } from '../../services/database'

/**
 * Integration tests for reaction processing workflow
 * Tests reaction tracking, user reactions, and hall of fame functionality
 */
describe('Reaction Processing Integration', () => {
	setupIntegrationTest()

	describe('reaction add processing', () => {
		it('processes new reaction and creates database records', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			// Create a message to react to
			const message = await createTestMessage('react-msg-001', channel.id, bob.id, 'Great message!')

			const reaction = createMockReaction({
				emoji: { id: null, name: '👍' },
				count: 1,
				message: createMockMessage({
					id: message.id,
					guild,
					channel,
				}),
			})

			await processReactionAdd(reaction, alice)

			// Should create reaction record
			const reactionRecord = await AssertDB.reactionExists(message.id, '👍')
			expect(reactionRecord.emojiName).toBe('👍')
			expect(reactionRecord.isCustom).toBe(false)
			expect(reactionRecord.count).toBe(1)

			// Should create user reaction record
			await AssertDB.reactionUserExists(reactionRecord.id, alice.id)
		})

		it('handles custom emoji reactions', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('custom-msg-001', channel.id, bob.id, 'Custom emoji test!')

			const reaction = createMockReaction({
				emoji: { id: '123456789', name: 'custom_emoji' },
				count: 1,
				message: createMockMessage({
					id: message.id,
					guild,
					channel,
				}),
			})

			await processReactionAdd(reaction, alice)

			// Should use emoji ID for custom emojis
			const reactionRecord = await AssertDB.reactionExists(message.id, '123456789')
			expect(reactionRecord.emojiName).toBe('custom_emoji')
			expect(reactionRecord.isCustom).toBe(true)
		})

		it('updates reaction count for existing reactions', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('update-msg-001', channel.id, bob.id, 'Popular message!')

			// Create existing reaction in database
			const existingReaction = await db.reaction.create({
				data: {
					messageId: message.id,
					emoji: '❤️',
					emojiName: '❤️',
					isCustom: false,
					count: 5,
				},
			})

			const reaction = createMockReaction({
				emoji: { id: null, name: '❤️' },
				count: 6, // Updated count from Discord
				message: createMockMessage({
					id: message.id,
					guild,
					channel,
				}),
			})

			await processReactionAdd(reaction, alice)

			// Should update existing reaction count
			const updatedReaction = await db.reaction.findUnique({
				where: { id: existingReaction.id },
			})
			expect(updatedReaction?.count).toBe(6)

			// Should add user reaction
			await AssertDB.reactionUserExists(existingReaction.id, alice.id)
		})

		it('handles multiple users reacting with same emoji', async () => {
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

			const message = await createTestMessage('multi-react-msg-001', channel.id, bob.id, 'Everyone loves this!')

			// Alice reacts first
			const reaction1 = createMockReaction({
				emoji: { id: null, name: '🎉' },
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
			})
			await processReactionAdd(reaction1, alice)

			// Bob reacts (count = 2)
			const reaction2 = createMockReaction({
				emoji: { id: null, name: '🎉' },
				count: 2,
				message: createMockMessage({ id: message.id, guild, channel }),
			})
			await processReactionAdd(reaction2, bob)

			// Charlie reacts (count = 3)
			const reaction3 = createMockReaction({
				emoji: { id: null, name: '🎉' },
				count: 3,
				message: createMockMessage({ id: message.id, guild, channel }),
			})
			await processReactionAdd(reaction3, charlie)

			// Should have one reaction record with count 3
			const reactionRecord = await AssertDB.reactionExists(message.id, '🎉')
			expect(reactionRecord.count).toBe(3)

			// Should have three user reaction records
			await AssertDB.reactionUserExists(reactionRecord.id, alice.id)
			await AssertDB.reactionUserExists(reactionRecord.id, bob.id)
			await AssertDB.reactionUserExists(reactionRecord.id, charlie.id)
		})

		it('creates user record if not exists during reaction', async () => {
			const { guild, channel, bob } = await seedTestData()
			const newUser = TestData.users.charlie()

			const message = await createTestMessage('new-user-react-001', channel.id, bob.id, 'New user reacts!')

			const reaction = createMockReaction({
				emoji: { id: null, name: '👋' },
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionAdd(reaction, newUser)

			// Should create user record
			await AssertDB.userExists(newUser.id)

			// Should create reaction records
			const reactionRecord = await AssertDB.reactionExists(message.id, '👋')
			await AssertDB.reactionUserExists(reactionRecord.id, newUser.id)
		})

		it('skips bot reactions', async () => {
			const { guild, channel, bob } = await seedTestData()
			const botUser = TestData.users.alice()
			botUser.bot = true

			const message = await createTestMessage('bot-react-001', channel.id, bob.id, 'Bot tries to react')

			const reaction = createMockReaction({
				emoji: { id: null, name: '🤖' },
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionAdd(reaction, botUser)

			// Should not create any reaction records
			const reactionRecord = await db.reaction.findFirst({
				where: { messageId: message.id, emoji: '🤖' },
			})
			expect(reactionRecord).toBeNull()
		})
	})

	describe('reaction remove processing', () => {
		it('removes user reaction and updates count', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('remove-msg-001', channel.id, bob.id, 'Remove reaction test')

			// Create reaction with count 2
			const reactionRecord = await db.reaction.create({
				data: {
					messageId: message.id,
					emoji: '⭐',
					emojiName: '⭐',
					isCustom: false,
					count: 2,
				},
			})

			// Create user reaction
			await db.reactionUser.create({
				data: {
					reactionId: reactionRecord.id,
					userId: alice.id,
				},
			})

			const reaction = createMockReaction({
				emoji: { id: null, name: '⭐' },
				count: 1, // Count after removal
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionRemove(reaction, alice)

			// Should update reaction count
			const updatedReaction = await db.reaction.findUnique({
				where: { id: reactionRecord.id },
			})
			expect(updatedReaction?.count).toBe(1)

			// Should remove user reaction
			const userReaction = await db.reactionUser.findFirst({
				where: { reactionId: reactionRecord.id, userId: alice.id },
			})
			expect(userReaction).toBeNull()
		})

		it('removes reaction record when count reaches zero', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('zero-count-msg-001', channel.id, bob.id, 'Last reaction removal')

			// Create reaction with count 1
			const reactionRecord = await db.reaction.create({
				data: {
					messageId: message.id,
					emoji: '💯',
					emojiName: '💯',
					isCustom: false,
					count: 1,
				},
			})

			// Create user reaction
			await db.reactionUser.create({
				data: {
					reactionId: reactionRecord.id,
					userId: alice.id,
				},
			})

			const reaction = createMockReaction({
				emoji: { id: null, name: '💯' },
				count: 0, // No reactions left
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionRemove(reaction, alice)

			// Should remove entire reaction record
			const removedReaction = await db.reaction.findUnique({
				where: { id: reactionRecord.id },
			})
			expect(removedReaction).toBeNull()

			// User reaction should also be gone
			const userReaction = await db.reactionUser.findFirst({
				where: { reactionId: reactionRecord.id, userId: alice.id },
			})
			expect(userReaction).toBeNull()
		})

		it('handles removing non-existent reaction gracefully', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('nonexist-msg-001', channel.id, bob.id, 'Non-existent reaction')

			const reaction = createMockReaction({
				emoji: { id: null, name: '🚫' },
				count: 0,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			// Should not throw error
			await expect(processReactionRemove(reaction, alice)).resolves.not.toThrow()
		})

		it('skips bot reaction removals', async () => {
			const { guild, channel, bob } = await seedTestData()
			const botUser = TestData.users.alice()
			botUser.bot = true

			const message = await createTestMessage('bot-remove-001', channel.id, bob.id, 'Bot removal test')

			// Create reaction that bot supposedly removes
			const reactionRecord = await db.reaction.create({
				data: {
					messageId: message.id,
					emoji: '🤖',
					emojiName: '🤖',
					isCustom: false,
					count: 1,
				},
			})

			const reaction = createMockReaction({
				emoji: { id: null, name: '🤖' },
				count: 0,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionRemove(reaction, botUser)

			// Reaction should still exist (bot removal ignored)
			const stillExists = await db.reaction.findUnique({
				where: { id: reactionRecord.id },
			})
			expect(stillExists).toBeTruthy()
		})
	})

	describe('partial data handling', () => {
		it('fetches partial reactions correctly', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('partial-msg-001', channel.id, bob.id, 'Partial reaction test')

			const partialReaction = createMockReaction({
				emoji: { id: null, name: '🔄' },
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
				partial: true,
				fetch: vi.fn().mockResolvedValue(createMockReaction({
					emoji: { id: null, name: '🔄' },
					count: 1,
					message: createMockMessage({ id: message.id, guild, channel }),
					partial: false,
				})),
			})

			await processReactionAdd(partialReaction, alice)

			// Should call fetch on partial reaction
			expect(partialReaction.fetch).toHaveBeenCalled()

			// Should still create records correctly
			await AssertDB.reactionExists(message.id, '🔄')
		})

		it('fetches partial users correctly', async () => {
			const { guild, channel, bob } = await seedTestData()
			const partialUser = {
				...TestData.users.charlie(),
				partial: true,
				fetch: vi.fn().mockResolvedValue(TestData.users.charlie()),
			}

			const message = await createTestMessage('partial-user-001', channel.id, bob.id, 'Partial user test')

			const reaction = createMockReaction({
				emoji: { id: null, name: '👤' },
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionAdd(reaction, partialUser as any)

			// Should call fetch on partial user
			expect(partialUser.fetch).toHaveBeenCalled()

			// Should create records correctly
			const reactionRecord = await AssertDB.reactionExists(message.id, '👤')
			await AssertDB.reactionUserExists(reactionRecord.id, partialUser.id)
		})
	})

	describe('edge cases and error handling', () => {
		it('handles unknown emoji gracefully', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('unknown-emoji-001', channel.id, bob.id, 'Unknown emoji test')

			const reaction = createMockReaction({
				emoji: { id: null, name: null }, // Both null
				count: 1,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionAdd(reaction, alice)

			// Should use 'unknown' as fallback
			await AssertDB.reactionExists(message.id, 'unknown')
		})

		it('handles very high reaction counts', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('high-count-001', channel.id, bob.id, 'Viral message!')

			const reaction = createMockReaction({
				emoji: { id: null, name: '🔥' },
				count: 999999,
				message: createMockMessage({ id: message.id, guild, channel }),
			})

			await processReactionAdd(reaction, alice)

			const reactionRecord = await AssertDB.reactionExists(message.id, '🔥')
			expect(reactionRecord.count).toBe(999999)
		})

		it('handles database constraint errors gracefully', async () => {
			const { guild, channel, alice } = await seedTestData()

			// Try to react to non-existent message
			const reaction = createMockReaction({
				emoji: { id: null, name: '⚠️' },
				count: 1,
				message: createMockMessage({
					id: 'non-existent-message',
					guild,
					channel,
				}),
			})

			// Should not throw error
			await expect(processReactionAdd(reaction, alice)).resolves.not.toThrow()
		})

		it('handles concurrent reactions correctly', async () => {
			const { guild, channel, alice, bob } = await seedTestData()

			const message = await createTestMessage('concurrent-001', channel.id, bob.id, 'Concurrent reactions')

			// Simulate two users reacting simultaneously
			const reactions = [
				createMockReaction({
					emoji: { id: null, name: '⚡' },
					count: 1,
					message: createMockMessage({ id: message.id, guild, channel }),
				}),
				createMockReaction({
					emoji: { id: null, name: '⚡' },
					count: 2,
					message: createMockMessage({ id: message.id, guild, channel }),
				}),
			]

			// Process both reactions
			await Promise.all([
				processReactionAdd(reactions[0], alice),
				processReactionAdd(reactions[1], bob),
			])

			// Should handle both reactions correctly
			const reactionRecord = await AssertDB.reactionExists(message.id, '⚡')
			await AssertDB.reactionUserExists(reactionRecord.id, alice.id)
			await AssertDB.reactionUserExists(reactionRecord.id, bob.id)
		})
	})
})