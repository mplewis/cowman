# Discord Bot Implementation Plan

## Overview

A TypeScript Discord bot that indexes server content and provides user renaming,
name voting competitions, message reaction tracking, and word usage analytics
with leaderboards.

## Architecture

### Tech Stack

- **Package Management**: pnpm
- **Runtime**: Node.js with TypeScript
- **Discord Library**: discord.js
- **Logging**: pino + pino-pretty
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Vitest with PostgreSQL test database
- **Deployment**: Docker container and GitHub Actions

### Core Components

1. **Bot Client**: Discord connection and event handling
2. **Command Handler**: Slash command processing
3. **Event Processors**: Message and reaction event handlers
4. **Backfill System**: Historical data indexing
5. **Database Layer**: Prisma models and queries
6. **Report Generator**: Leaderboard and analytics

## Database Schema

### Tables

- `users`: Discord user info and custom names
- `channels`: Channel metadata and backfill progress
- `messages`: Message content with metadata
- `reactions`: Reaction tracking per message
- `words`: Word usage tracking per user
- `name_battles`: A vs B name voting competitions
- `name_votes`: Individual votes in name battles
- `names`: Name catalog with usage statistics
- `rename_history`: Complete rename operation history
- `backfill_state`: Progress tracking per domain/channel

## Implementation Phases

### Phase 1: Project Setup

- [x] Initialize TypeScript project with proper tooling
- [x] Set up Prisma with PostgreSQL
- [x] Create database schema and migrations
- [x] Configure discord.js client
- [x] Implement basic bot connection

### Phase 2: Core Event Handling

- [x] Message event processor
- [x] Reaction event processor
- [x] Word extraction and stemming logic
- [x] Basic data persistence

### Phase 3: Rename Feature

- [x] Slash command `/rename @user NewName`
- [x] User nickname storage and retrieval
- [x] Name catalog creation and usage tracking
- [x] Rename history logging
- [x] Display custom names in reports

### Phase 4: Best Name Feature

- [ ] Name battle creation system (A vs B format)
- [ ] Interactive Discord button voting interface
- [ ] Vote tracking and win percentage calculation
- [ ] Best names leaderboard by win rate with links to original rename messages

### Phase 5: Hall of Fame

- [ ] Reaction threshold configuration
- [ ] Message ranking by total reactions
- [ ] Message ranking by specific reaction types
- [ ] Leaderboard generation with Discord links

### Phase 6: Word Tracker

- [ ] Text processing pipeline (lowercase, trim, stem)
- [ ] Word count aggregation per user
- [ ] Server-wide word frequency tracking
- [ ] Word usage leaderboards

### Phase 7: Backfill System

- [ ] Message history pagination handler
- [ ] Progress tracking per channel
- [ ] Resumable backfill operations
- [ ] Slash commands to trigger backfills

### Phase 8: Reporting & UI

- [ ] Slash command framework
- [ ] Leaderboard formatting
- [ ] Interactive report generation
- [ ] Error handling and user feedback

### Phase 9: Testing & Polish

- [ ] Unit tests for core logic
- [ ] Integration tests with test database
- [ ] Error handling improvements
- [ ] Performance optimizations

## Key Implementation Details

### Message Processing Pipeline

```
Discord Message → Text Extraction → Word Stemming → Database Storage
                ↓
        Reaction Tracking → Hall of Fame Updates
```

### Backfill Strategy

- Track progress per (guild_id, channel_id, last_message_id)
- Use Discord's `before` parameter for pagination
- Handle rate limiting and interruption recovery
- Process messages in chronological order for consistency

### Command Structure

- `/rename @user nickname` - Set user nickname
- `/name-battle name1 name2` - Start A vs B name voting poll
- `/leaderboard names` - Show best names by win percentage
- `/leaderboard popular-names` - Show most used names
- `/backfill [channel]` - Start/resume channel backfill
- `/leaderboard reactions [reaction]` - Show reaction leaderboards
- `/leaderboard words [user]` - Show word usage stats
- `/hall-of-fame [count]` - Show top reacted messages

### Error Handling

- Rate limit respect and retry logic
- Database connection resilience
- Graceful degradation for missing permissions
- Comprehensive logging for debugging

## Deployment Considerations

- Environment variables for bot token and database URL
- Database migrations on deployment
- Process monitoring and restart capability
- Backup strategy for indexed data
