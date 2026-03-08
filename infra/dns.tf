# DNS records are managed outside Terraform (Cloudflare dashboard / Pages auto-config).
# Zone data source kept for reference by other resources if needed.

data "cloudflare_zone" "main" {
  filter = {
    name = var.domain
  }
}
