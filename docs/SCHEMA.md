# Database Schema - Entity Relationship Diagram

## ER Diagram

```mermaid
erDiagram
    Guild {
        string id PK "Discord Guild ID"
        string name "Guild Name"
        datetime created_at
        datetime updated_at
    }

    Channel {
        string id PK "Discord Channel ID"
        string guild_id FK "References Guild.id"
        string name "Channel Name"
        string type "Channel Type (text, voice, etc)"
        datetime created_at
        datetime updated_at
    }

    User {
        string id PK "Discord User ID"
        string username "Discord Username"
        string display_name "Discord Display Name"
        string avatar_url "Avatar URL"
        string custom_name "Bot-assigned Custom Name"
        datetime created_at
        datetime updated_at
    }

    Message {
        string id PK "Discord Message ID"
        string channel_id FK "References Channel.id"
        string author_id FK "References User.id"
        text content "Message Content"
        datetime timestamp "Message Timestamp"
        boolean edited "Was Message Edited"
        datetime edited_timestamp "Last Edit Time"
        json attachments "Attachment URLs/Info"
        datetime created_at
        datetime updated_at
    }

    Reaction {
        string id PK "Generated UUID"
        string message_id FK "References Message.id"
        string emoji "Emoji Unicode or Custom ID"
        string emoji_name "Emoji Name"
        boolean is_custom "Is Custom Emoji"
        integer count "Total Reaction Count"
        datetime created_at
        datetime updated_at
    }

    ReactionUser {
        string id PK "Generated UUID"
        string reaction_id FK "References Reaction.id"
        string user_id FK "References User.id"
        datetime created_at
    }

    Word {
        string id PK "Generated UUID"
        string word "Stemmed Word"
        string original_form "Original Word Form"
        datetime created_at
    }

    WordUsage {
        string id PK "Generated UUID"
        string word_id FK "References Word.id"
        string user_id FK "References User.id"
        string message_id FK "References Message.id"
        integer count "Word Count in Message"
        datetime created_at
    }

    NameBattle {
        string id PK "Generated UUID"
        string guild_id FK "References Guild.id"
        string name_a "First name in battle"
        string name_b "Second name in battle"
        string message_id "Discord message ID of poll"
        boolean active "Is battle still accepting votes"
        datetime created_at
        datetime updated_at
    }

    NameVote {
        string id PK "Generated UUID"
        string battle_id FK "References NameBattle.id"
        string user_id FK "References User.id"
        string choice "Choice: 'a' or 'b'"
        datetime created_at
    }

    Name {
        string id PK "Generated UUID"
        string guild_id FK "References Guild.id"
        string name "The name text"
        integer usage_count "Times this name has been used"
        datetime first_used "When first used in rename"
        datetime last_used "When last used in rename"
        datetime created_at
        datetime updated_at
    }

    RenameHistory {
        string id PK "Generated UUID"
        string guild_id FK "References Guild.id"
        string target_user_id FK "References User.id"
        string renamed_by_user_id FK "References User.id"
        string name_id FK "References Name.id"
        string previous_name "Previous custom name (if any)"
        string channel_id "Channel where rename happened"
        string message_id "Message ID of rename command"
        datetime created_at
    }

    BackfillState {
        string id PK "Generated UUID"
        string guild_id FK "References Guild.id"
        string channel_id FK "References Channel.id"
        string last_message_id "Last Processed Message ID"
        boolean completed "Is Backfill Complete"
        datetime started_at "Backfill Start Time"
        datetime completed_at "Backfill Completion Time"
        datetime created_at
        datetime updated_at
    }

    %% Relationships
    Guild ||--o{ Channel : contains
    Channel ||--o{ Message : contains
    Channel ||--o{ BackfillState : "backfill progress"

    User ||--o{ Message : authors
    User ||--o{ ReactionUser : "reacts with"
    User ||--o{ WordUsage : "uses words"
    User ||--o{ NameVote : "votes in battles"
    User ||--o{ RenameHistory : "target of renames"
    User ||--o{ RenameHistory : "performs renames"

    Message ||--o{ Reaction : "receives"
    Message ||--o{ WordUsage : "contains words"

    Reaction ||--o{ ReactionUser : "reacted by users"

    Word ||--o{ WordUsage : "usage instances"

    Guild ||--o{ BackfillState : "backfill tracking"
    Guild ||--o{ NameBattle : "name battles"
    Guild ||--o{ Name : "name catalog"
    Guild ||--o{ RenameHistory : "rename tracking"

    NameBattle ||--o{ NameVote : "receives votes"
    Name ||--o{ RenameHistory : "used in renames"
```

## Table Details

### Guild

Represents Discord servers (guilds) where the bot operates.

### Channel

Discord channels within guilds. Tracks backfill progress per channel.

### User

Discord users with bot-assigned custom names for the rename feature.

### Message

Individual Discord messages with full content and metadata.

### Reaction

Aggregated reaction data per message. Tracks emoji type and total count.

### ReactionUser

Many-to-many relationship tracking which users reacted with which reactions.

### Word

Dictionary of stemmed words to normalize word tracking across different forms.

### WordUsage

Tracks word usage per user per message, enabling both user-specific and
server-wide analytics.

### NameBattle

Represents A vs B name voting competitions. Links to Discord message with
interactive buttons.

### NameVote

Individual user votes in name battles. Prevents duplicate voting and tracks
choice (A or B).

### Name

Catalog of all names used in the guild. Tracks popularity and usage statistics
for leaderboards.

### RenameHistory

Complete history of all rename operations. Tracks who renamed whom and when, with links back to the original rename message for Best Name leaderboards.

### BackfillState

Tracks backfill progress per guild/channel combination, enabling resumable
operations.

## Key Design Decisions

### Normalization

- Words are normalized to avoid duplicates ("running", "runs", "ran" → "run")
- Reactions are aggregated per message to optimize leaderboard queries
- Separate ReactionUser table maintains individual user reaction data
- Name battles use separate NameVote table to prevent duplicate voting
- Names are tracked separately from users to enable popularity statistics
- Complete rename history maintained for auditing and analytics

### Performance Considerations

- Composite indexes on (guild_id, channel_id) for backfill queries
- Indexes on user_id and word_id for leaderboard generation
- Message timestamp index for chronological processing
- Composite index on (battle_id, user_id) for vote uniqueness
- Index on (guild_id, active) for active battle queries
- Index on (guild_id, usage_count) for name popularity leaderboards
- Index on (guild_id, target_user_id) for rename history queries

### Scalability

- String IDs match Discord's snowflake format (up to 19 digits)
- JSON field for attachment metadata allows flexible storage
- Separate tables for reactions vs reaction users supports large servers

### Data Integrity

- Foreign key constraints ensure referential integrity
- NOT NULL constraints on critical fields
- Unique constraints on natural keys where appropriate
