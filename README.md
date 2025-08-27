# Cowman Discord Bot

A TypeScript Discord bot that indexes server content and provides user renaming, name voting competitions, message reaction tracking, and word usage analytics with leaderboards.

## Features

- **User Renaming**: Allow users to rename each other with custom nicknames
- **Best Name Voting**: A vs B format voting on names with win percentage leaderboards
- **Hall of Fame**: Track and rank messages by reaction counts
- **Word Analytics**: Track word usage patterns with stemming and leaderboards
- **Message Backfill**: Index historical server content with resumable operations

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Discord bot token and application

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd cowman
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Discord and database credentials
   ```

3. **Set up database**:
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Run database migrations
   pnpm db:migrate
   ```

4. **Start the bot**:
   ```bash
   # Development mode with hot reload
   pnpm dev
   
   # Production mode
   pnpm build
   pnpm start
   ```

### Discord Bot Setup

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token for your `.env` file

2. **Set Bot Permissions**:
   Required permissions:
   - Read Messages/View Channels
   - Send Messages
   - Use Slash Commands
   - Add Reactions
   - Read Message History

3. **Invite Bot to Server**:
   - Go to "OAuth2" > "URL Generator"
   - Select "bot" and "applications.commands" scopes
   - Select the required permissions
   - Use the generated URL to invite the bot

## Environment Variables

Create a `.env` file with the following variables:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/cowman

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Commands (Planned)

- `/rename @user nickname` - Set user nickname
- `/name-battle name1 name2` - Start A vs B name voting poll
- `/leaderboard names` - Show best names by win percentage
- `/leaderboard popular-names` - Show most used names
- `/leaderboard reactions [reaction]` - Show reaction leaderboards
- `/leaderboard words [user]` - Show word usage stats
- `/hall-of-fame [count]` - Show top reacted messages
- `/backfill [channel]` - Start/resume channel backfill

## Development

### Project Structure

```
src/
├── commands/          # Slash command handlers
├── events/           # Discord event handlers
├── services/         # Core services (database, discord)
├── utils/            # Utility functions and helpers
├── test/             # Test files and setup
└── index.ts          # Main entry point
```

### Available Scripts

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build TypeScript
pnpm start            # Run built version

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:deploy        # Deploy migrations (production)
pnpm db:studio        # Open Prisma Studio
```

### Database Schema

The bot uses PostgreSQL with Prisma ORM. Key tables include:

- `guilds` - Discord server information
- `users` - Discord users with custom names
- `messages` - Indexed message content
- `reactions` - Reaction tracking
- `words` - Word stemming and usage
- `name_battles` - A vs B voting competitions
- `names` - Name catalog with statistics

See [docs/SCHEMA.md](docs/SCHEMA.md) for detailed schema documentation.

## Implementation Progress

See [docs/PLAN.md](docs/PLAN.md) for detailed implementation roadmap.

### Phase 1: Project Setup ✅
- [x] TypeScript project setup
- [x] Prisma database configuration
- [x] Discord.js client setup
- [x] Basic bot connection

### Phase 2-9: In Development
- [ ] Event handling
- [ ] Rename system
- [ ] Best name voting
- [ ] Hall of fame
- [ ] Word tracking
- [ ] Backfill system
- [ ] Commands & UI
- [ ] Testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC