# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.0.0] - 2026-03-13

### Added
- Initial release: ToolDB Self-Hosted — Docker image for self-hosting a personal tool inventory application
- Go backend serving a React SPA with all static assets bundled into a single container
- SQLite storage by default (zero configuration, data in `./data/`)
- Optional PostgreSQL support via `DATABASE_URL` environment variable
- Multi-photo and receipt upload support with file storage in `DATA_DIR`
- Tool and battery inventory, maintenance log, kit organization, tag management
- Insurance export (CSV/PDF) and analytics dashboard
- Dark/light theme
- Optional username/password authentication (disabled by default) with JWT signing
- Multi-stage Docker build (Go 1.25 + Node frontend)
- GitHub Actions workflow publishing Docker image to GHCR (`ghcr.io/paradosi/tooldb-selfhosted`)
- `docker-compose.yml` for one-command startup (`docker compose up -d`, open `:8080`)
- Postgres variant compose config documented in README
- Backup instructions for both SQLite and Postgres
- AGPL-3.0 license
