# Goal

Build a Discord bot with the following featureset.

# Features

## Rename

Allow users to rename each other using messages of this format:

```
/rename @Some User Cool Dude
```

where `@Some User` is a Discord @-mention

Any user can rename any other user.

## Best Name

Allow users to vote on the best name using an A vs B format, where the bot
presents a poll with buttons, and users can click the buttons to vote on which
name is better.

Produce a leaderboard ordering names by highest win percentage, and link to the
rename message.

## Hall of Fame

Track messages that have received at least a set number of the same reaction
(like a vote).

Create leaderboards for:

- messages that have received the most reactions
- messages that have received the most of a specific reaction (e.g. star vs.
  thumbs up vs plus sign)

Leaderboards link to the messages in question.

## Word Tracker

As users type messages, read the messages. Lowercase, trim, and stem words.
Track word count used by user.

Provide leaderboards for:

- most used words in the server
- most used words by each user

# UI

Daily interaction is the users chatting and the bot observing and cataloging
behavior.

When users want to read info out of the bot, they can use slash commands to ask
the bot to print a report (leaderboard, etc.) in the channel.

# Backfill

The bot needs to be able to backfill history for each domain. Since Discord
provides messages in reverse chronological order, we need to track by (domain,
channel, last message #).

Backfills can be kicked off by using slash commands.

# Framework

This will be a TypeScript app.

# Database

Use Postgres to store all data. Use Prisma as the ORM.

# Testing

Write unit tests where appropriate. Use Postgres as a test database.
