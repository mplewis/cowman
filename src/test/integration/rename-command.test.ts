import { describe, it, expect } from 'vitest'
import { executeCommand } from '../../lib/commandHandler'
import { createMockCommandInteraction, createMockGuildMember, TestData } from '../discord-mocks'
import { setupIntegrationTest, seedTestData, AssertDB } from '../integration-helpers'
import { db } from '../../services/database'
import '../../commands/rename'

/**
 * Integration tests for the rename command workflow
 * Tests the complete flow from slash command to database storage
 */
describe('Rename Command Integration', () => {
	setupIntegrationTest()

	describe('successful rename', () => {
		it('creates name record and rename history when renaming user', async () => {
			const { guild, alice, bob } = await seedTestData()

			// Mock the guild member with setNickname capability
			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
				setNickname: vi.fn().mockResolvedValue(undefined),
			})

			// Mock the interaction
			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('CoolDude'),
				},
			})

			// Mock guild.members.fetch to return our mock member
			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			// Execute the rename command
			await executeCommand(interaction)

			// Assert successful response
			expect(interaction.reply).toHaveBeenCalledWith({
				content: `Renamed ${bob.username} to CoolDude`,
			})

			// Assert database changes
			await AssertDB.nameExists(guild.id, 'CoolDude')
			await AssertDB.renameHistoryExists(bob.id, 'CoolDude')

			// Verify the name has correct usage count
			const nameRecord = await AssertDB.nameExists(guild.id, 'CoolDude')
			expect(nameRecord.usageCount).toBe(1)

			// Verify rename history is complete
			const history = await AssertDB.renameHistoryExists(bob.id, 'CoolDude')
			expect(history.renamedByUserId).toBe(alice.id)
			expect(history.previousName).toBe(bob.displayName)
		})

		it('increments usage count when reusing existing name', async () => {
			const { guild, alice, bob } = await seedTestData()

			// Create existing name with usage count 5
			const existingName = await db.name.create({
				data: {
					guildId: guild.id,
					name: 'PopularName',
					usageCount: 5,
					firstUsed: new Date(),
					lastUsed: new Date(),
				},
			})

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('PopularName'),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			// Verify usage count was incremented
			const updatedName = await db.name.findUnique({
				where: { id: existingName.id },
			})
			expect(updatedName?.usageCount).toBe(6)
		})

		it('handles custom name display correctly', async () => {
			const { guild, alice, bob } = await seedTestData()

			// Set bob to have a custom name already
			await db.user.update({
				where: { id: bob.id },
				data: { customName: 'ExistingCustomName' },
			})

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('NewCustomName'),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			// Verify previous name in history is the custom name, not Discord name
			const history = await AssertDB.renameHistoryExists(bob.id, 'NewCustomName')
			expect(history.previousName).toBe('ExistingCustomName')

			// Verify user's custom name was updated
			const updatedUser = await db.user.findUnique({ where: { id: bob.id } })
			expect(updatedUser?.customName).toBe('NewCustomName')
		})
	})

	describe('error handling', () => {
		it('handles Discord API errors gracefully', async () => {
			const { guild, alice, bob } = await seedTestData()

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
				setNickname: vi.fn().mockRejectedValue(new Error('Missing Permissions')),
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('TestName'),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			// Should still reply with user-friendly error message
			expect(interaction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining("I don't have the required permissions"),
				ephemeral: true,
			})

			// Should not create database records on failure
			const nameRecord = await db.name.findFirst({
				where: { guildId: guild.id, name: 'TestName' },
			})
			expect(nameRecord).toBeNull()
		})

		it('handles user not found in guild', async () => {
			const { guild, alice, bob } = await seedTestData()

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('TestName'),
				},
			})

			// Mock guild.members.fetch to throw "Unknown Member" error
			interaction.guild!.members = {
				fetch: vi.fn().mockRejectedValue(new Error('Unknown Member')),
			} as any

			await executeCommand(interaction)

			expect(interaction.reply).toHaveBeenCalledWith({
				content: 'User not found in this server.',
				ephemeral: true,
			})
		})

		it('handles missing permissions with descriptive message', async () => {
			const { guild, alice, bob } = await seedTestData()

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
				setNickname: vi.fn().mockRejectedValue(new Error('Missing Permissions: Manage Nicknames')),
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue('TestName'),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			expect(interaction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('Manage Nicknames'),
				ephemeral: true,
			})
		})
	})

	describe('edge cases', () => {
		it('handles very long names', async () => {
			const { guild, alice, bob } = await seedTestData()

			const longName = 'A'.repeat(50) // Exceeds Discord's 32 char limit

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
				setNickname: vi.fn().mockRejectedValue(new Error('Maximum length exceeded')),
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue(longName),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			expect(interaction.reply).toHaveBeenCalledWith({
				content: expect.stringContaining('32 characters or less'),
				ephemeral: true,
			})
		})

		it('handles renaming self', async () => {
			const { guild, alice } = await seedTestData()

			const mockMember = createMockGuildMember({
				id: alice.id,
				user: alice,
				guild,
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(alice), // Self-rename
					getString: vi.fn().mockReturnValue('SelfRename'),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			// Should work the same as renaming others
			expect(interaction.reply).toHaveBeenCalledWith({
				content: `Renamed ${alice.username} to SelfRename`,
			})

			await AssertDB.renameHistoryExists(alice.id, 'SelfRename')
		})

		it('handles special characters in names', async () => {
			const { guild, alice, bob } = await seedTestData()

			const specialName = '🔥Cool-Name_123🔥'

			const mockMember = createMockGuildMember({
				id: bob.id,
				user: bob,
				guild,
			})

			const interaction = createMockCommandInteraction({
				commandName: 'rename',
				user: alice,
				guild,
				options: {
					getUser: vi.fn().mockReturnValue(bob),
					getString: vi.fn().mockReturnValue(specialName),
				},
			})

			interaction.guild!.members = {
				fetch: vi.fn().mockResolvedValue(mockMember),
			} as any

			await executeCommand(interaction)

			// Should handle special characters correctly
			await AssertDB.nameExists(guild.id, specialName)
			await AssertDB.renameHistoryExists(bob.id, specialName)
		})
	})
})