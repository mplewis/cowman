# Integration Tests

This directory contains comprehensive integration tests for the Cowman Discord bot's core workflows.

## Overview

These tests simulate real Discord interactions and validate complete end-to-end workflows without requiring an actual Discord server. They use a test PostgreSQL database and mock Discord objects to ensure reliability and speed.

## Test Structure

### Test Categories

1. **Rename Command Tests** (`rename-command.test.ts`)
   - Slash command execution
   - Database record creation (names, rename history)
   - Discord nickname updates
   - Error handling (permissions, user not found, etc.)
   - Edge cases (long names, special characters, self-rename)

2. **Name Battle Tests** (`name-battle.test.ts`)
   - Battle creation with random name selection
   - Button interaction voting workflow
   - Vote tracking and management
   - Vote changes and duplicate prevention
   - Multi-user voting scenarios

3. **Message Processing Tests** (`message-processing.test.ts`)
   - Message storage and metadata tracking
   - Word extraction and stemming
   - Word usage analytics
   - User and entity management
   - Attachment handling

4. **Reaction Processing Tests** (`reaction-processing.test.ts`)
   - Reaction add/remove events
   - Custom vs Unicode emoji handling
   - User reaction tracking
   - Reaction count management
   - Hall of fame functionality preparation

5. **Leaderboard Tests** (`leaderboard.test.ts`)
   - Popular names leaderboard
   - Best names by win rate
   - Word usage leaderboard
   - Reaction leaderboard
   - Display formatting and limits

## Test Infrastructure

### Mock Objects (`../discord-mocks.ts`)
- Mock Discord users, guilds, channels, messages, reactions
- Mock command and button interactions
- Consistent test data factories
- Realistic Discord API behavior simulation

### Integration Helpers (`../integration-helpers.ts`)
- Database cleanup and seeding utilities
- Assertion helpers for database state
- Test data creation functions
- Error simulation utilities

### Test Setup (`../setup.ts`)
- Test database initialization
- Schema migrations
- Environment variable configuration
- Cleanup between test runs

## Running Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test:integration src/test/integration/rename-command.test.ts

# Run all tests (including unit tests)
pnpm test:run

# Watch mode for development
pnpm test src/test/integration
```

## Test Database

Tests use a separate PostgreSQL database (`cowman-test`) to avoid interfering with development data. The database is:

- Completely reset before each test file
- Cleaned between individual tests
- Migrated with latest schema on startup
- Isolated from development and production databases

## Key Testing Patterns

### Workflow Testing
Each test follows the complete user workflow:
1. Setup initial state (users, guilds, etc.)
2. Execute the user action (command, reaction, etc.)
3. Verify Discord API interactions (replies, embeds)
4. Assert database state changes
5. Test error conditions and edge cases

### Database Assertions
Helper functions validate expected database state:
```typescript
await AssertDB.userExists(userId)
await AssertDB.nameExists(guildId, 'NameValue')
await AssertDB.renameHistoryExists(userId, 'NameValue')
await AssertDB.nameVoteExists(battleId, userId, 'a')
```

### Mock Verification
Tests verify Discord API calls:
```typescript
expect(interaction.reply).toHaveBeenCalledWith({
  content: 'Expected response',
  ephemeral: true,
})
```

## Coverage Goals

These integration tests cover:

### Core User Workflows
- ✅ Renaming users via slash commands
- ✅ Creating and participating in name battles
- ✅ Viewing leaderboards of various types
- ✅ Automatic message and reaction processing

### Error Scenarios
- ✅ Discord API permission errors
- ✅ Database constraint violations
- ✅ Invalid user input
- ✅ Missing data conditions
- ✅ Concurrent operation handling

### Edge Cases
- ✅ Special characters in names
- ✅ Very long content
- ✅ Empty datasets
- ✅ Bot message filtering
- ✅ Partial Discord objects

### Data Integrity
- ✅ Foreign key relationships
- ✅ Usage count tracking
- ✅ Vote counting accuracy
- ✅ Word processing consistency
- ✅ User information updates

## Benefits Over Manual Testing

1. **Speed**: Tests run in seconds vs. minutes of manual Discord testing
2. **Reliability**: Consistent test data and conditions
3. **Coverage**: Tests scenarios difficult to reproduce manually
4. **Automation**: Can run on CI/CD pipeline
5. **Debugging**: Clear failure messages and database inspection
6. **Regression Prevention**: Catch breaks in existing functionality

## Adding New Tests

When adding new features:

1. Create integration tests following existing patterns
2. Use the mock factories for consistent test data
3. Test both happy path and error conditions
4. Verify complete workflow end-to-end
5. Assert expected database state changes
6. Include edge cases and boundary conditions

Example test structure:
```typescript
describe('New Feature Integration', () => {
  setupIntegrationTest()

  describe('happy path', () => {
    it('handles standard use case', async () => {
      const { guild, alice } = await seedTestData()
      // Test implementation
    })
  })

  describe('error handling', () => {
    it('handles expected error condition', async () => {
      // Error test implementation
    })
  })

  describe('edge cases', () => {
    it('handles boundary condition', async () => {
      // Edge case test implementation
    })
  })
})
```