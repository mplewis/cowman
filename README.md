# Cowman

A Discord bot that allows users to rename other users via command.

## Usage

Once the bot is invited to your server, use the command:

```
rename @user to NewNickname
```

The bot will change the mentioned user's nickname to the specified name.

## Installation

### Docker

```bash
docker run -d \
  -e AUTH_TOKEN=your_bot_token_here \
  ghcr.io/mplewis/cowman:latest
```

### From source

```bash
go install github.com/mplewis/cowman@latest
```

## Configuration

The bot requires the following environment variable:

- `AUTH_TOKEN`: Your Discord bot token

Optional environment variables:

- `DEBUG`: Set to any value to enable debug logging
- `DEVELOPMENT`: Set to any value to enable pretty console output

### Local development

Create a `.env` file in the working directory:

```
AUTH_TOKEN=your_bot_token_here
DEBUG=1
DEVELOPMENT=1
```

Then run:

```bash
go run .
```

## Building

```bash
go build .
```

## Docker

```bash
docker build -t cowman .
```

## License

MIT
