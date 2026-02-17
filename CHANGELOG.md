# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-02-16

### Added
- Discord bot that renames users via command
- `rename <user> to <name>` command support
- Docker support with multi-stage builds
- GitHub Actions CI/CD pipeline
- Environment variable loading via `.env` files for local development
- Structured logging with zerolog

### Changed
- Migrated from CircleCI to GitHub Actions
- Upgraded to Go 1.26
- Updated dependencies (discordgo v0.29.0, zerolog v1.34.0)

[Unreleased]: https://github.com/mplewis/cowman/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mplewis/cowman/releases/tag/v0.1.0
