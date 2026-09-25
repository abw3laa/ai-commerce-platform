# Security

Never commit API keys, database passwords, admin passwords, WhatsApp credentials, or session tokens.

Admin access uses opaque server-side sessions with hashed tokens and RBAC. AI tools have bounded access and use database repositories as the source of truth.

External channel webhooks must be authenticated by their provider-specific adapter before normalized messages enter the commerce pipeline.

Database backups use PostgreSQL custom format. Store backups outside the application checkout, encrypt remote copies, and periodically restore them in an isolated environment.

Production checklist:
- NODE_ENV=production
- dedicated least-privilege PostgreSQL role
- secrets outside Git
- durable WHATSAPP_AUTH_DIR and MEDIA_STORAGE_DIR
- scheduled database backups and tested restoration
- monitor /health and /health/ready
- restrict network access to the reverse proxy/application port
