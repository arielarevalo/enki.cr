resource "cloudflare_pages_project" "frontend" {
  account_id = var.account_id
  name       = local.project_name

  production_branch = "main"

  lifecycle {
    ignore_changes = [deployment_configs]
  }
}

resource "cloudflare_pages_domain" "apex" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.frontend.name
  name         = var.domain
}
