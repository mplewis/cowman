# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-02-16

### Fixed
- Fixed GitHub Actions workflow syntax error (missing `fi` in tag check)
- Fixed Docker job to run after release creates a new tag on main
- Fixed Docker Hub username to use repo vars instead of secrets

## [0.1.0] - 2026-02-16

### Added
- Discord bot that renames users via command
- `rename <user> to <name>` command support
- Docker support with multi-stage builds including tzdata
- GitHub Actions CI/CD pipeline
- Environment variable loading via `.env` files for local development
- Structured logging with zerolog
- CHANGELOG.md for tracking version changes
- Comprehensive documentation in README.md

### Changed
- Migrated from JavaScript to Go
- Removed prometheus metrics
- Removed cloudbuild configuration

[Unreleased]: https://github.com/mplewis/cowman/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/mplewis/cowman/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mplewis/cowman/releases/tag/v0.1.0
