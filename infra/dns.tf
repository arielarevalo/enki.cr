# DNS records are auto-created by Cloudflare:
#   - Pages custom domain (cloudflare_pages_domain) creates CNAME for enki.cr
#   - Workers custom domains (cloudflare_workers_custom_domain) create records for api/agents subdomains
# No explicit cloudflare_dns_record resources needed (would conflict with auto-managed records).

data "cloudflare_zone" "main" {
  filter = {
    name = var.domain
  }
}
