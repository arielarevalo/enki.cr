# [enki.cr](https://enki.cr)

## Architecture

- **Frontend**: Static HTML on Cloudflare Pages
- **Backend**: Cloudflare Worker (`enki-api`)
- **Agents**: Single Cloudflare Worker (`enki-agents`) with three Agent classes (Cloudflare Agents SDK)

Architectural decisions are recorded in [`doc/adr/`](doc/adr/). See [ADR-0001](doc/adr/0001-record-architecture-decisions.md) for the format.

## Infrastructure as Code

All Cloudflare resources are managed with Terraform in the [`infra/`](infra/) directory.

### Change Flow

1. Create a branch
2. Edit files in `infra/`
3. Open a PR — GitHub Actions runs `terraform plan` and posts the output as a comment
4. Review the plan
5. Merge to `main` — GitHub Actions runs `terraform apply`

### Terraform vs Wrangler

| Concern | Managed by |
|---------|-----------|
| Pages project, Worker scripts, DNS records | Terraform |
| Code deployment, content uploads | Wrangler |
| Agent bindings, migrations | Wrangler (`agents/wrangler.jsonc`) |
| Local development | Wrangler (`wrangler dev`) |

These tools never manage the same resource attributes. Worker scripts use `lifecycle { ignore_changes = [content] }` in Terraform so Wrangler owns the deployed code.

### Adding New Resources

Add a `.tf` file (or edit an existing one) in `infra/`, then follow the change flow above.

### Secrets Management

- **Terraform variables**: Passed via `TF_VAR_*` environment variables, stored as GitHub repository secrets
- **Runtime secrets**: Set via `wrangler secret put <NAME>` per Worker

### Local Development

```bash
# Frontend
cd frontend && npx wrangler pages dev .

# Backend
cd backend && npx wrangler dev

# Agents
cd agents && npx wrangler dev
```

## Bootstrap (One-Time Setup)

Before the first `terraform init`, create the R2 state bucket and S3 API credentials:

```bash
npx wrangler r2 bucket create enki-terraform-state
```

Then create an R2 S3 API token in the Cloudflare dashboard (R2 > Manage R2 API Tokens) with read/write access to the `enki-terraform-state` bucket. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as environment variables and GitHub secrets.

Initialize Terraform and import the existing Pages project:

```bash
cd infra
terraform init -backend-config="endpoints={s3=\"https://<ACCOUNT_ID>.r2.cloudflarestorage.com\"}"
terraform import cloudflare_pages_project.frontend <ACCOUNT_ID>/enki
terraform plan  # Should show minimal changes
```
