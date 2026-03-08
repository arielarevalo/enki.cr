# 2. Terraform IaC for Cloudflare

## Status

Accepted

## Context

Enki needs infrastructure-as-code for its Cloudflare resources: a Pages project (frontend), Workers (backend API and agents), DNS records, and future storage bindings. The codebase had empty per-component `infra/` directories that were scaffolded but never used.

We need a solution that:
- Manages all Cloudflare resources declaratively
- Provides PR-based review for infrastructure changes
- Coexists with Wrangler, which handles code deployment and local dev

## Decision

- **Single root `infra/` directory** with one Terraform state for all Cloudflare resources. Per-component `infra/` dirs are removed.
- **R2 bucket as S3-compatible state backend** (`enki-terraform-state`). R2 doesn't support state locking, but GitHub Actions concurrency groups serialize CI runs.
- **Terraform provisions resources; Wrangler deploys code.** Worker scripts use `lifecycle { ignore_changes = [content] }` so Terraform creates the resource but Wrangler manages the deployed code. They never touch the same attributes.
- **GitHub Actions workflows**: `terraform-plan.yml` runs `plan` on PRs modifying `infra/**`; `terraform-apply.yml` runs `apply` on merge to `main`.
- **R2 bootstrap is a one-time manual step**: create the bucket and S3 API credentials before the first `terraform init`.

## Consequences

- All infrastructure changes go through PR review with plan output visible in comments.
- Wrangler and Terraform responsibilities are clearly separated — violating this boundary will cause drift.
- The R2 state backend requires a manual bootstrap before Terraform can be initialized.
- No state locking means concurrent applies could corrupt state; CI concurrency groups mitigate this.
- Adding new Cloudflare resources means editing files in `infra/`, not scattered per-component directories.
