import type {
	ChatInputCommandInteraction,
	ButtonInteraction,
	Message,
	MessageReaction,
	User,
	Guild,
	GuildMember,
	TextChannel,
	PartialMessageReaction,
	PartialUser,
} from 'discord.js'

/**
 * Mock Discord User
 */
export function createMockUser(overrides: Partial<User> = {}): User {
	return {
		id: '123456789',
		username: 'testuser',
		displayName: 'Test User',
		bot: false,
		displayAvatarURL: () => 'https://example.com/avatar.png',
		...overrides,
	} as User
}

/**
 * Mock Discord Guild
 */
export function createMockGuild(overrides: Partial<Guild> = {}): Guild {
	return {
		id: '987654321',
		name: 'Test Guild',
		...overrides,
	} as Guild
}

/**
 * Mock Discord Channel
 */
export function createMockChannel(overrides: Partial<TextChannel> = {}): TextChannel {
	return {
		id: '555666777',
		name: 'test-channel',
		type: 0, // TEXT
		...overrides,
	} as TextChannel
}

/**
 * Mock Discord Message
 */
export function createMockMessage(overrides: Partial<Message> = {}): Message {
	const user = createMockUser()
	const guild = createMockGuild()
	const channel = createMockChannel()

	return {
		id: '111222333',
		content: 'Test message',
		author: user,
		guild,
		channel,
		createdAt: new Date(),
		editedAt: null,
		attachments: new Map(),
		...overrides,
	} as Message
}

/**
 * Mock Discord Reaction
 */
export function createMockReaction(overrides: Partial<MessageReaction> = {}): MessageReaction {
	const message = createMockMessage()

	return {
		emoji: {
			id: null,
			name: '👍',
		},
		count: 1,
		message,
		partial: false,
		fetch: async () => overrides as MessageReaction,
		...overrides,
	} as MessageReaction
}

/**
 * Mock ChatInputCommandInteraction
 */
export function createMockCommandInteraction(
	overrides: Partial<ChatInputCommandInteraction> = {}
): ChatInputCommandInteraction {
	const user = createMockUser()
	const guild = createMockGuild()
	const channel = createMockChannel()

	const mockReply = vi.fn().mockResolvedValue(undefined)
	const mockEditReply = vi.fn().mockResolvedValue(undefined)
	const mockDeferReply = vi.fn().mockResolvedValue(undefined)
	const mockFollowUp = vi.fn().mockResolvedValue(undefined)

	return {
		id: '444555666',
		commandName: 'test',
		user,
		guild,
		channel,
		replied: false,
		deferred: false,
		reply: mockReply,
		editReply: mockEditReply,
		deferReply: mockDeferReply,
		followUp: mockFollowUp,
		options: {
			getString: vi.fn().mockReturnValue('test'),
			getUser: vi.fn().mockReturnValue(user),
			getInteger: vi.fn().mockReturnValue(10),
		},
		...overrides,
	} as unknown as ChatInputCommandInteraction
}

/**
 * Mock ButtonInteraction
 */
export function createMockButtonInteraction(overrides: Partial<ButtonInteraction> = {}): ButtonInteraction {
	const user = createMockUser()
	const guild = createMockGuild()
	const message = createMockMessage()

	const mockReply = vi.fn().mockResolvedValue(undefined)

	return {
		id: '777888999',
		customId: 'test_button',
		user,
		guild,
		message,
		reply: mockReply,
		...overrides,
	} as unknown as ButtonInteraction
}

/**
 * Mock GuildMember
 */
export function createMockGuildMember(overrides: Partial<GuildMember> = {}): GuildMember {
	const user = createMockUser()
	const guild = createMockGuild()

	return {
		id: user.id,
		user,
		guild,
		nickname: null,
		displayName: user.displayName,
		setNickname: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as GuildMember
}

/**
 * Test data factory for consistent test objects
 */
export const TestData = {
	users: {
		alice: () => createMockUser({ 
			id: '100', 
			username: 'alice', 
			displayName: 'Alice',
			toString: () => '<@100>' as `<@${string}>`,
			valueOf: () => '100',
		}),
		bob: () => createMockUser({ 
			id: '200', 
			username: 'bob', 
			displayName: 'Bob',
			toString: () => '<@200>' as `<@${string}>`,
			valueOf: () => '200',
		}),
		charlie: () => createMockUser({ 
			id: '300', 
			username: 'charlie', 
			displayName: 'Charlie',
			toString: () => '<@300>' as `<@${string}>`,
			valueOf: () => '300',
		}),
	},
	guilds: {
		testGuild: () => createMockGuild({ 
			id: '500', 
			name: 'Test Guild',
			valueOf: () => '500',
		}),
	},
	channels: {
		general: () => createMockChannel({ 
			id: '600', 
			name: 'general',
			toString: () => '<#600>' as `<#${string}>`,
			valueOf: () => '600',
		}),
	},
}