# NocoDB Integration — Build Spec

## Decision Summary
- **NocoDB** replaces the dashboard's Bases section (spreadsheets, calculations, CSV export)
- **Data** stays in Neon (cloud Postgres) — NocoDB connects to it as external data source
- **NocoDB** runs in Docker on Mac mini (can migrate to Railway later — same Docker image, same connection string)
- **Dashboard** remains the hub — tasks, CRM, projects, metrics stay in our Next.js app
- **Notion** stays for client-facing docs (call sheets, project briefs shared with crew)

## Architecture
```
Browser → dashboard.oliviermarcolin.com (Vercel)
                    ↓
              Neon Postgres (cloud, Sydney)
                    ↑
Browser → NocoDB (Docker on Mac mini, via Tailscale/Cloudflare)
```

## Phase 1: Docker Setup on Mac Mini

### Install Docker (if not already installed)
```bash
brew install --cask docker
# Or: download from docker.com
```

### Run NocoDB
```bash
docker run -d \
  --name nocodb \
  --restart unless-stopped \
  -p 8080:8080 \
  -e NC_DB="pg://ep-jolly-grass-a7ffwvsd-pooler.ap-southeast-2.aws.neon.tech:5432?u=neondb_owner&p=npg_jyxJkq7F4oCW&d=neondb&ssl.rejectUnauthorized=false" \
  -e NC_AUTH_JWT_SECRET="$(openssl rand -hex 32)" \
  -v nocodb_data:/usr/app/data/ \
  nocodb/nocodb:latest
```

### Verify
- Access at `http://localhost:8080`
- Create admin account
- Verify it can see existing Neon tables (tasks, projects, contacts, etc.)

## Phase 2: Network Access

### Option A: Tailscale (private — just Oli + Charlie)
NocoDB is automatically accessible on the Tailscale network at:
`http://charlie-mac:8080` (or whatever the Tailscale hostname is)

### Option B: Cloudflare Tunnel (public — shareable links)
```bash
cloudflared tunnel --url http://localhost:8080
```
Or set up a persistent tunnel at `bases.oliviermarcolin.com`

Start with Option A. Add Cloudflare later if public sharing is needed.

## Phase 3: Dashboard Integration

### Replace Bases page
- Current `/bases` page → replace with redirect or embed
- Add "Open NocoDB" link in sidebar under Bases
- Keep sidebar nav item "Bases" pointing to NocoDB URL

### API integration (future)
- Use NocoDB REST API from dashboard API routes if needed
- `nocodb-sdk` npm package for TypeScript integration
- Can display NocoDB data in dashboard widgets

## Phase 4: Cleanup
- Remove `bases` and `base_rows` tables from Drizzle schema
- Remove old Bases page components
- Remove base-related stores/providers

## Migration to Railway (when ready)
```bash
# Same image, same env vars, just hosted in the cloud
railway login
railway init
railway up --dockerfile -
# Set env vars in Railway dashboard: NC_DB, NC_AUTH_JWT_SECRET
```
That's it. 5 minutes. Data stays in Neon either way.

## System Documentation
Write full infrastructure doc to iCloud at:
`~/Library/Mobile Documents/com~apple~CloudDocs/🐙 Charlie/system-architecture.md`

---

## Build Steps for Claude Code
1. Check Docker is installed (`docker --version`)
2. Pull NocoDB image (`docker pull nocodb/nocodb:latest`)
3. Generate JWT secret, store in ~/.openclaw/.env as `NOCODB_JWT_SECRET`
4. Start NocoDB container with Neon connection
5. Verify container is running and accessible on localhost:8080
6. Update dashboard: replace `/bases` page with NocoDB link/redirect
7. Remove old Bases code (schema tables, components, stores)
8. Write system architecture doc to iCloud
9. Commit dashboard changes
