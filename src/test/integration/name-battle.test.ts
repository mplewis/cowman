import { describe, it, expect } from 'vitest'
import { executeCommand } from '../../lib/commandHandler'
import { handleNameBattleInteraction } from '../../lib/buttonInteractions'
import { createMockCommandInteraction, createMockButtonInteraction, TestData } from '../discord-mocks'
import { setupIntegrationTest, seedTestData, createTestName, AssertDB } from '../integration-helpers'
import { db } from '../../services/database'
import '../../commands/nameBattle'

/**
 * Integration tests for the name battle workflow
 * Tests battle creation, voting, and vote tracking
 */
describe('Name Battle Integration', () => {
	setupIntegrationTest()

	describe('battle creation', () => {
		it('creates name battle with random names from database', async () => {
			const { guild, alice } = await seedTestData()

			// Create some names in the database
			await createTestName(guild.id, 'CoolName', 5)
			await createTestName(guild.id, 'AwesomeName', 3)
			await createTestName(guild.id, 'SuperName', 8)

			const interaction = createMockCommandInteraction({
				commandName: 'name-battle',
				user: alice,
				guild,
			})

			// Mock the reply to capture the battle creation
			const mockMessage = { id: 'battle-message-123' }
			interaction.reply = vi.fn().mockResolvedValue(mockMessage)

			await executeCommand(interaction)

			// Should have called reply with embed and buttons
			expect(interaction.reply).toHaveBeenCalledWith({
				embeds: expect.arrayContaining([
					expect.objectContaining({
						data: expect.objectContaining({
							title: 'Name Battle! 🥊',
							description: expect.stringContaining('vs'),
						}),
					}),
				]),
				components: expect.arrayContaining([
					expect.objectContaining({
						components: expect.arrayContaining([
							expect.objectContaining({
								data: expect.objectContaining({
									custom_id: 'name_battle_a',
									style: 1, // Primary
								}),
							}),
							expect.objectContaining({
								data: expect.objectContaining({
									custom_id: 'name_battle_b',
									style: 1, // Primary
								}),
							}),
						]),
					}),
				]),
			})

			// Should have created battle in database
			const battle = await db.nameBattle.findFirst({
				where: { guildId: guild.id },
			})
			expect(battle).toBeTruthy()
			expect(battle!.active).toBe(true)
			expect(['CoolName', 'AwesomeName', 'SuperName']).toContain(battle!.nameA)
			expect(['CoolName', 'AwesomeName', 'SuperName']).toContain(battle!.nameB)
			expect(battle!.nameA).not.toBe(battle!.nameB) // Should be different names
		})

		it('handles insufficient names in database', async () => {
			const { guild, alice } = await seedTestData()

			// Create only one name (insufficient for battle)
			await createTestName(guild.id, 'OnlyName', 1)

			const interaction = createMockCommandInteraction({
				commandName: 'name-battle',
				user: alice,
				guild,
			})

			await executeCommand(interaction)

			// Should reply with error message
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'Not enough names in the catalog to create a battle. Need at least 2 names.',
				ephemeral: true,
			})

			// Should not create battle in database
			const battle = await db.nameBattle.findFirst({
				where: { guildId: guild.id },
			})
			expect(battle).toBeNull()
		})

		it('handles empty name catalog', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'name-battle',
				user: alice,
				guild,
			})

			await executeCommand(interaction)

			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'Not enough names in the catalog to create a battle. Need at least 2 names.',
				ephemeral: true,
			})
		})
	})

	describe('voting workflow', () => {
		it('processes new vote correctly', async () => {
			const { guild, alice } = await seedTestData()

			// Create a battle
			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TeamA',
					nameB: 'TeamB',
					messageId: 'battle-msg-456',
					active: true,
				},
			})

			// Create button interaction for voting
			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: alice,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should reply with confirmation
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'You voted for TeamA',
				ephemeral: true,
			})

			// Should create vote in database
			await AssertDB.nameVoteExists(battle.id, alice.id, 'a')
		})

		it('handles vote changes correctly', async () => {
			const { guild, alice } = await seedTestData()

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TeamA',
					nameB: 'TeamB',
					messageId: 'battle-msg-789',
					active: true,
				},
			})

			// Create existing vote for 'a'
			await db.nameVote.create({
				data: {
					battleId: battle.id,
					userId: alice.id,
					choice: 'a',
				},
			})

			// Try to vote for 'b' (change vote)
			const interaction = createMockButtonInteraction({
				customId: 'name_battle_b',
				user: alice,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should reply with vote change confirmation
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'Your vote has been changed to TeamB',
				ephemeral: true,
			})

			// Should update vote in database
			const updatedVote = await db.nameVote.findFirst({
				where: { battleId: battle.id, userId: alice.id },
			})
			expect(updatedVote?.choice).toBe('b')
		})

		it('prevents duplicate voting', async () => {
			const { guild, alice } = await seedTestData()

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TeamA',
					nameB: 'TeamB',
					messageId: 'battle-msg-101',
					active: true,
				},
			})

			// Create existing vote for 'a'
			await db.nameVote.create({
				data: {
					battleId: battle.id,
					userId: alice.id,
					choice: 'a',
				},
			})

			// Try to vote for 'a' again (same choice)
			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: alice,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should reply with already voted message
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'You have already voted for TeamA',
				ephemeral: true,
			})

			// Should not create duplicate vote
			const votes = await db.nameVote.findMany({
				where: { battleId: battle.id, userId: alice.id },
			})
			expect(votes).toHaveLength(1)
		})

		it('handles inactive battle voting', async () => {
			const { guild, alice } = await seedTestData()

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TeamA',
					nameB: 'TeamB',
					messageId: 'battle-msg-202',
					active: false, // Inactive battle
				},
			})

			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: alice,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should reply with inactive message
			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'This name battle is no longer active.',
				ephemeral: true,
			})

			// Should not create vote
			const vote = await db.nameVote.findFirst({
				where: { battleId: battle.id, userId: alice.id },
			})
			expect(vote).toBeNull()
		})

		it('handles non-existent battle', async () => {
			const { guild, alice } = await seedTestData()

			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: alice,
				guild,
				message: { id: 'non-existent-battle' } as any,
			})

			await handleNameBattleInteraction(interaction)

			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'This name battle is no longer active.',
				ephemeral: true,
			})
		})
	})

	describe('multi-user voting scenarios', () => {
		it('handles multiple users voting on same battle', async () => {
			const { guild, alice, bob } = await seedTestData()
			const charlie = TestData.users.charlie()
			
			// Create charlie in database
			await db.user.create({
				data: {
					id: charlie.id,
					username: charlie.username,
					displayName: charlie.displayName,
					avatarUrl: charlie.displayAvatarURL(),
				},
			})

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'PopularName',
					nameB: 'UnpopularName',
					messageId: 'multi-user-battle',
					active: true,
				},
			})

			// Alice votes for A
			const aliceInteraction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: alice,
				guild,
				message: { id: battle.messageId } as any,
			})
			await handleNameBattleInteraction(aliceInteraction)

			// Bob votes for B
			const bobInteraction = createMockButtonInteraction({
				customId: 'name_battle_b',
				user: bob,
				guild,
				message: { id: battle.messageId } as any,
			})
			await handleNameBattleInteraction(bobInteraction)

			// Charlie votes for A
			const charlieInteraction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: charlie,
				guild,
				message: { id: battle.messageId } as any,
			})
			await handleNameBattleInteraction(charlieInteraction)

			// Verify all votes were recorded
			await AssertDB.nameVoteExists(battle.id, alice.id, 'a')
			await AssertDB.nameVoteExists(battle.id, bob.id, 'b')
			await AssertDB.nameVoteExists(battle.id, charlie.id, 'a')

			// Verify vote counts
			const votesA = await db.nameVote.count({
				where: { battleId: battle.id, choice: 'a' },
			})
			const votesB = await db.nameVote.count({
				where: { battleId: battle.id, choice: 'b' },
			})

			expect(votesA).toBe(2) // Alice + Charlie
			expect(votesB).toBe(1) // Bob
		})

		it('handles user changing vote multiple times', async () => {
			const { guild, alice } = await seedTestData()

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'FlipFlopA',
					nameB: 'FlipFlopB',
					messageId: 'flip-flop-battle',
					active: true,
				},
			})

			// Vote A -> B -> A -> B
			const interactions = [
				{ customId: 'name_battle_a', expected: 'a' },
				{ customId: 'name_battle_b', expected: 'b' },
				{ customId: 'name_battle_a', expected: 'a' },
				{ customId: 'name_battle_b', expected: 'b' },
			]

			for (const { customId, expected } of interactions) {
				const interaction = createMockButtonInteraction({
					customId,
					user: alice,
					guild,
					message: { id: battle.messageId } as any,
				})
				await handleNameBattleInteraction(interaction)
			}

			// Should end up with final vote being 'b'
			const finalVote = await db.nameVote.findFirst({
				where: { battleId: battle.id, userId: alice.id },
			})
			expect(finalVote?.choice).toBe('b')

			// Should only have one vote record (not multiple)
			const allVotes = await db.nameVote.findMany({
				where: { battleId: battle.id, userId: alice.id },
			})
			expect(allVotes).toHaveLength(1)
		})
	})

	describe('user management in voting', () => {
		it('creates user record if not exists during voting', async () => {
			const { guild } = await seedTestData()
			const newUser = TestData.users.charlie()

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TestA',
					nameB: 'TestB',
					messageId: 'new-user-battle',
					active: true,
				},
			})

			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: newUser,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should have created user and vote
			await AssertDB.userExists(newUser.id)
			await AssertDB.nameVoteExists(battle.id, newUser.id, 'a')
		})

		it('updates user info during voting if changed', async () => {
			const { guild, alice } = await seedTestData()

			// Update alice's Discord info
			const updatedAlice = {
				...alice,
				username: 'alice_updated',
				displayName: 'Alice Updated',
				displayAvatarURL: () => 'https://example.com/new-avatar.png',
			}

			const battle = await db.nameBattle.create({
				data: {
					guildId: guild.id,
					nameA: 'TestA',
					nameB: 'TestB',
					messageId: 'update-user-battle',
					active: true,
				},
			})

			const interaction = createMockButtonInteraction({
				customId: 'name_battle_a',
				user: updatedAlice,
				guild,
				message: { id: battle.messageId } as any,
			})

			await handleNameBattleInteraction(interaction)

			// Should have updated user info
			const user = await db.user.findUnique({ where: { id: alice.id } })
			expect(user?.username).toBe('alice_updated')
			expect(user?.displayName).toBe('Alice Updated')
			expect(user?.avatarUrl).toBe('https://example.com/new-avatar.png')
		})
	})
})