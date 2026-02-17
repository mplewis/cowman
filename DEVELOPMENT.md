# Development

## Prerequisites

- Go 1.26+
- Docker (for containerized development)
- Discord bot token

## Getting Started

1. Create a `.env` file in the project root:

```
AUTH_TOKEN=your_bot_token_here
DEBUG=1
DEVELOPMENT=1
```

2. Run the bot:

```bash
go run .
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_TOKEN` | Yes | Discord bot token |
| `DEBUG` | No | Enable debug logging |
| `DEVELOPMENT` | No | Enable pretty console output |

## Building

```bash
go build .
```

The binary will be output as `cowman` in the current directory.

## Running Tests

```bash
go test ./...
```

## Docker Development

Build the image:

```bash
docker build -t cowman .
```

Run locally:

```bash
docker run -d \
  -e AUTH_TOKEN=your_bot_token_here \
  cowman
```

## Release Process

Releases are automated via GitHub Actions:

1. Update the `VERSION` file with the new version (e.g., `0.2.0`)
2. Commit and push to `main`
3. The CI workflow will:
   - Run tests
   - Create a git tag (`v0.2.0`)
   - Build and push Docker images to GHCR

## Project Structure

```
.
├── main.go           # Application entry point
├── go.mod            # Go module definition
├── go.sum            # Go module checksums
├── Dockerfile        # Multi-stage Docker build
├── VERSION           # Current version (for releases)
├── .env.example      # Example environment variables
├── CHANGELOG.md      # Version history
├── README.md         # User documentation
├── DEVELOPMENT.md    # This file
└── .github/
    └── workflows/
        └── ci.yml    # CI/CD pipeline
```

## Dependencies

- `github.com/bwmarrin/discordgo` - Discord API bindings
- `github.com/joho/godotenv` - Environment variable loading from .env
- `github.com/rs/zerolog` - Structured logging

## Code Style

- Follow standard Go conventions
- Run `gofmt` before committing
- Add docstrings to all exported functions
