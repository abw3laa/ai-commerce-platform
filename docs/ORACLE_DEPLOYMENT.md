# Oracle deployment

Use the existing Oracle Ubuntu host; do not add another database or application service.

1. Install Docker Engine/Compose and ensure the host firewall only exposes the reverse proxy/HTTPS ports and SSH.
2. Clone the repository and create `.env` from `.env.example`. Store secrets only in `.env` or the host secret mechanism; never commit them.
3. Create durable directories for the production media and WhatsApp authentication volumes.
4. Start with `docker compose -f docker-compose.production.yml up -d --build`.
5. Run `docker compose -f docker-compose.production.yml exec app npm run verify:production`.
6. Schedule `scripts/backup-postgres.sh` from the host with cron/systemd timers and keep multiple timestamped backups outside the application container.
7. Schedule `scripts/monitor-production.sh` every 1–5 minutes. Set `BASE_URL` to the local app URL and optionally `ALERT_WEBHOOK_URL` to an approved alert receiver.
8. Before a migration, take a backup. After a restore drill, run the readiness check and the application test suite.

The repository intentionally does not contain Oracle credentials, DNS certificates, WhatsApp account data, AI API keys, or carrier/social credentials. Those are deployment secrets and provider-side configuration.

For carrier integrations, configure the provider-specific gateway only after the carrier grants API credentials. DHL's current tracking documentation, for example, requires application credentials and offers both request/response and push tracking APIs.