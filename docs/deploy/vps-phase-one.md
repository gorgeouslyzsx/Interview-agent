# VPS Phase One Deployment

This project is now prepared for a single-server Docker deployment with PostgreSQL.

## Required Server Setup

1. Install Docker and Docker Compose on the server.
2. Point your domain DNS A record to the server public IP.
3. Copy the repository to the server.
4. Prepare `.env.production` and Compose variables:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-production-env.ps1
```

On Linux servers, create the same files manually if PowerShell is unavailable.

5. Create a Compose environment file named `.env` with database settings if you did not run the script:

```bash
POSTGRES_DB=interview_agent
POSTGRES_USER=interview
POSTGRES_IMAGE=postgres:16-alpine
POSTGRES_PASSWORD=replace-with-a-strong-db-password
APP_PORT=3000
```

6. Generate a strong app secret:

```bash
openssl rand -base64 32
```

7. Put that value in `.env.production` as `APP_SECRET`.
8. Start the stack:

```bash
docker compose up -d --build
```

If Docker Hub is not reachable from your network, change `POSTGRES_IMAGE` in `.env` to a registry mirror that you can pull successfully, then run `docker compose up -d --build` again.

### Docker Desktop mirror setup

If you are on Windows and Docker Hub keeps returning EOF, open Docker Desktop, go to `Settings -> Docker Engine`, and add a `registry-mirrors` entry like this:

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io"
  ]
}
```

Then apply and restart Docker Desktop before running Compose again.

The app container runs `prisma migrate deploy` before starting Next.js.

## Nginx

Use `deploy/nginx/interview-agent.conf` as a starting point. Replace `example.com`, copy it to your Nginx sites directory, enable it, then issue an HTTPS certificate with Certbot or your cloud vendor.

## Backups

Run a database backup before upgrades:

```bash
docker compose exec db pg_dump -U interview interview_agent | gzip > interview-agent-$(date +%Y%m%d-%H%M%S).sql.gz
```

Keep backups off the server as well as on the server.
