import { describe, it, expect } from 'vitest'
import { processMessage } from '../../lib/messageProcessor'
import { createMockMessage, TestData } from '../discord-mocks'
import { setupIntegrationTest, seedTestData, AssertDB } from '../integration-helpers'
import { db } from '../../services/database'

/**
 * Integration tests for message processing workflow
 * Tests message storage, word extraction, and user tracking
 */
describe('Message Processing Integration', () => {
	setupIntegrationTest()

	describe('basic message processing', () => {
		it('processes simple message and stores in database', async () => {
			const { guild, channel, alice } = await seedTestData()

			const message = createMockMessage({
				id: 'msg-001',
				content: 'Hello world!',
				author: alice,
				guild,
				channel,
				createdAt: new Date('2024-01-01T10:00:00Z'),
			})

			await processMessage(message)

			// Should create message record
			const storedMessage = await AssertDB.messageExists('msg-001')
			expect(storedMessage.content).toBe('Hello world!')
			expect(storedMessage.authorId).toBe(alice.id)
			expect(storedMessage.channelId).toBe(channel.id)
			expect(storedMessage.edited).toBe(false)
		})

		it('processes message with attachments', async () => {
			const { guild, channel, alice } = await seedTestData()

			const mockAttachments = new Map([
				['attach-1', {
					id: 'attach-1',
					url: 'https://example.com/image.png',
					name: 'image.png',
					size: 1024,
				}],
				['attach-2', {
					id: 'attach-2', 
					url: 'https://example.com/document.pdf',
					name: 'document.pdf',
					size: 2048,
				}],
			])

			const message = createMockMessage({
				id: 'msg-002',
				content: 'Check out these files!',
				author: alice,
				guild,
				channel,
				attachments: mockAttachments as any,
			})

			await processMessage(message)

			const storedMessage = await AssertDB.messageExists('msg-002')
			expect(storedMessage.attachments).toEqual([
				{ id: 'attach-1', url: 'https://example.com/image.png', name: 'image.png', size: 1024 },
				{ id: 'attach-2', url: 'https://example.com/document.pdf', name: 'document.pdf', size: 2048 },
			])
		})

		it('handles edited messages correctly', async () => {
			const { guild, channel, alice } = await seedTestData()

			const editedDate = new Date('2024-01-01T11:00:00Z')
			const message = createMockMessage({
				id: 'msg-003',
				content: 'This message was edited',
				author: alice,
				guild,
				channel,
				createdAt: new Date('2024-01-01T10:00:00Z'),
				editedAt: editedDate,
			})

			await processMessage(message)

			const storedMessage = await AssertDB.messageExists('msg-003')
			expect(storedMessage.edited).toBe(true)
			expect(storedMessage.editedTimestamp).toEqual(editedDate)
		})

		it('skips bot messages', async () => {
			const { guild, channel } = await seedTestData()

			const botUser = TestData.users.alice()
			botUser.bot = true

			const message = createMockMessage({
				id: 'bot-msg-001',
				content: 'I am a bot message',
				author: botUser,
				guild,
				channel,
			})

			await processMessage(message)

			// Should not create message record for bot
			const storedMessage = await db.message.findUnique({
				where: { id: 'bot-msg-001' },
			})
			expect(storedMessage).toBeNull()
		})
	})

	describe('word processing and tracking', () => {
		it('extracts and processes words from message content', async () => {
			const { guild, channel, alice } = await seedTestData()

			const message = createMockMessage({
				id: 'word-msg-001',
				content: 'The quick brown fox jumps over the lazy dog',
				author: alice,
				guild,
				channel,
			})

			await processMessage(message)

			// Should create word usage records
			await AssertDB.wordUsageExists(alice.id, 'word-msg-001')

			// Check specific words were processed (stemmed)
			const wordUsages = await db.wordUsage.findMany({
				where: { userId: alice.id, messageId: 'word-msg-001' },
				include: { word: true },
			})

			// Extract the stemmed words
			const stemmedWords = wordUsages.map(wu => wu.word.word).sort()
			
			// Should include stemmed versions of major words (excluding "the")
			expect(stemmedWords).toContain('quick')
			expect(stemmedWords).toContain('brown')
			expect(stemmedWords).toContain('jump') // "jumps" -> "jump"
			expect(stemmedWords).toContain('lazi') // "lazy" -> "lazi"
		})

		it('handles word count correctly for repeated words', async () => {
			const { guild, channel, alice } = await seedTestData()

			const message = createMockMessage({
				id: 'repeat-msg-001',
				content: 'test test testing tested tests',
				author: alice,
				guild,
				channel,
			})

			await processMessage(message)

			// All variations should stem to "test"
			const wordUsage = await db.wordUsage.findFirst({
				where: { 
					userId: alice.id, 
					messageId: 'repeat-msg-001',
					word: { word: 'test' } 
				},
				include: { word: true },
			})

			expect(wordUsage).toBeTruthy()
			expect(wordUsage?.count).toBe(5) // All 5 words stem to "test"
		})

		it('handles special characters and URLs in messages', async () => {
			const { guild, channel, alice } = await seedTestData()

			const message = createMockMessage({
				id: 'special-msg-001',
				content: 'Check out https://example.com and @user mention #channel! 🔥',
				author: alice,
				guild,
				channel,
			})

			await processMessage(message)

			// Should clean and process only actual words
			const wordUsages = await db.wordUsage.findMany({
				where: { userId: alice.id, messageId: 'special-msg-001' },
				include: { word: true },
			})

			const words = wordUsages.map(wu => wu.word.word)
			
			// Should include "check" but not URLs, mentions, etc.
			expect(words).toContain('check')
			expect(words).not.toContain('https://example.com')
			expect(words).not.toContain('@user')
			expect(words).not.toContain('#channel')
		})

		it('handles empty and whitespace-only messages', async () => {
			const { guild, channel, alice } = await seedTestData()

			const message = createMockMessage({
				id: 'empty-msg-001',
				content: '   \n\t   ',
				author: alice,
				guild,
				channel,
			})

			await processMessage(message)

			// Should create message record but no word usage
			await AssertDB.messageExists('empty-msg-001')

			const wordUsages = await db.wordUsage.findMany({
				where: { userId: alice.id, messageId: 'empty-msg-001' },
			})
			expect(wordUsages).toHaveLength(0)
		})

		it('processes multiple messages from same user correctly', async () => {
			const { guild, channel, alice } = await seedTestData()

			const messages = [
				{ id: 'multi-msg-001', content: 'hello world' },
				{ id: 'multi-msg-002', content: 'world peace' },
				{ id: 'multi-msg-003', content: 'hello again' },
			]

			for (const msgData of messages) {
				const message = createMockMessage({
					id: msgData.id,
					content: msgData.content,
					author: alice,
					guild,
					channel,
				})
				await processMessage(message)
			}

			// Should have separate word usage records for each message
			const allUsages = await db.wordUsage.findMany({
				where: { userId: alice.id },
				include: { word: true },
				orderBy: { messageId: 'asc' },
			})

			expect(allUsages.length).toBeGreaterThan(0)

			// Check specific word appears in multiple messages
			const helloUsages = allUsages.filter(wu => wu.word.word === 'hello')
			expect(helloUsages).toHaveLength(2) // In msg-001 and msg-003
		})
	})

	describe('user and entity management', () => {
		it('creates user record if not exists', async () => {
			const { guild, channel } = await seedTestData()
			const newUser = TestData.users.charlie()

			const message = createMockMessage({
				id: 'new-user-msg-001',
				content: 'Hello from new user!',
				author: newUser,
				guild,
				channel,
			})

			await processMessage(message)

			// Should create user record
			await AssertDB.userExists(newUser.id)
		})

		it('updates user info if changed', async () => {
			const { guild, channel, alice } = await seedTestData()

			// Create updated version of alice
			const updatedAlice = {
				...alice,
				username: 'alice_new',
				displayName: 'Alice New Name',
				displayAvatarURL: () => 'https://example.com/new.png',
			}

			const message = createMockMessage({
				id: 'update-user-msg-001',
				content: 'Hello with new info!',
				author: updatedAlice,
				guild,
				channel,
			})

			await processMessage(message)

			// Should update user record
			const user = await db.user.findUnique({ where: { id: alice.id } })
			expect(user?.username).toBe('alice_new')
			expect(user?.displayName).toBe('Alice New Name')
			expect(user?.avatarUrl).toBe('https://example.com/new.png')
		})

		it('handles DM messages correctly', async () => {
			const alice = TestData.users.alice()
			
			// Create user in database
			await db.user.create({
				data: {
					id: alice.id,
					username: alice.username,
					displayName: alice.displayName,
					avatarUrl: alice.displayAvatarURL(),
				},
			})

			const message = createMockMessage({
				id: 'dm-msg-001',
				content: 'This is a DM',
				author: alice,
				guild: null, // DM has no guild
				channel: { id: 'dm-channel', name: null } as any,
			})

			await processMessage(message)

			// Should create DM guild and channel
			const dmGuild = await db.guild.findUnique({ where: { id: 'dm' } })
			expect(dmGuild?.name).toBe('Direct Message')

			await AssertDB.messageExists('dm-msg-001')
		})

		it('handles guild and channel creation', async () => {
			const alice = TestData.users.alice()
			const newGuild = TestData.guilds.testGuild()
			const newChannel = TestData.channels.general()
			
			// Don't seed - let message processing create them
			await db.user.create({
				data: {
					id: alice.id,
					username: alice.username,
					displayName: alice.displayName,
					avatarUrl: alice.displayAvatarURL(),
				},
			})

			const message = createMockMessage({
				id: 'new-entities-msg-001',
				content: 'Hello in new guild!',
				author: alice,
				guild: newGuild,
				channel: newChannel,
			})

			await processMessage(message)

			// Should create guild and channel
			const guild = await db.guild.findUnique({ where: { id: newGuild.id } })
			expect(guild?.name).toBe(newGuild.name)

			const channel = await db.channel.findUnique({ where: { id: newChannel.id } })
			expect(channel?.name).toBe(newChannel.name)
			expect(channel?.guildId).toBe(newGuild.id)
		})
	})

	describe('error handling', () => {
		it('handles database errors gracefully', async () => {
			const { guild, channel, alice } = await seedTestData()

			// Create a message that will cause constraint violation
			// by using invalid channel ID (foreign key constraint)
			const message = createMockMessage({
				id: 'error-msg-001',
				content: 'This should fail',
				author: alice,
				guild,
				channel: { ...channel, id: 'non-existent-channel' },
			})

			// Should not throw - should handle error gracefully
			await expect(processMessage(message)).resolves.not.toThrow()

			// Message should not be created
			const storedMessage = await db.message.findUnique({
				where: { id: 'error-msg-001' },
			})
			expect(storedMessage).toBeNull()
		})

		it('continues processing when word extraction fails', async () => {
			const { guild, channel, alice } = await seedTestData()

			// Mock extractWords to throw error
			vi.mock('../../utils/textProcessor', () => ({
				extractWords: vi.fn(() => {
					throw new Error('Word extraction failed')
				}),
			}))

			const message = createMockMessage({
				id: 'word-error-msg-001',
				content: 'This should partially work',
				author: alice,
				guild,
				channel,
			})

			await expect(processMessage(message)).resolves.not.toThrow()

			// Message should still be created even if word processing fails
			await AssertDB.messageExists('word-error-msg-001')
		})
	})
})