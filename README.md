# ToolDB Self-Hosted

A self-hosted tool inventory application. Track your tools, batteries, and equipment with photos, receipts, maintenance logs, and more.

## Quick Start

```bash
mkdir tooldb && cd tooldb
curl -O https://raw.githubusercontent.com/paradosi/tooldb-selfhosted/main/docker-compose.yml
docker compose up -d
```

Open http://localhost:8080

That's it. Your data is stored in `./data/`.

## Features

- Tool and battery inventory with photos and receipts
- Maintenance log tracking
- Kit organization
- Tag management
- Insurance export (CSV/PDF)
- Analytics dashboard
- Dark/light theme
- Optional authentication

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `DATABASE_TYPE` | `sqlite` | Database type (`sqlite` or `postgres`) |
| `DATABASE_URL` | — | Postgres connection string (required when using Postgres) |
| `DATA_DIR` | `/data` | Directory for SQLite database and uploaded files |
| `AUTH_ENABLED` | `false` | Enable username/password authentication |
| `AUTH_USERNAME` | — | Login username (required when auth enabled) |
| `AUTH_PASSWORD` | — | Login password (required when auth enabled) |
| `JWT_SECRET` | (random) | JWT signing secret (auto-generated if not set) |

## Authentication

Authentication is **disabled by default** — the app is immediately usable with no login.

To enable:

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERNAME=admin
  - AUTH_PASSWORD=your-secure-password
```

## Using Postgres

By default, ToolDB uses SQLite (zero configuration, single file). To use Postgres instead:

```yaml
services:
  tooldb:
    image: ghcr.io/paradosi/tooldb-selfhosted:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data/photos:/data/photos
    environment:
      - DATABASE_URL=postgres://tooldb:tooldb@db:5432/tooldb
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=tooldb
      - POSTGRES_PASSWORD=tooldb
      - POSTGRES_DB=tooldb

volumes:
  pgdata:
```

## Backup

**SQLite:**
```bash
cp ./data/tooldb.db ./backup/tooldb-$(date +%Y%m%d).db
```

**Postgres:**
```bash
docker compose exec db pg_dump -U tooldb tooldb > backup.sql
```

**Photos & Receipts:**
```bash
cp -r ./data/photos ./backup/photos
cp -r ./data/receipts ./backup/receipts
```

## Development

```bash
# Backend
go run main.go

# Frontend (separate terminal)
cd frontend && npm run dev

# Build
docker compose build
```

## License

AGPL-3.0
