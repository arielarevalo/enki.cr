resource "cloudflare_workers_script" "backend" {
  account_id  = var.account_id
  script_name = "enki-api"

  # Placeholder content — Wrangler deploys the real code
  content = "addEventListener('fetch', event => { event.respondWith(new Response('ok')) })"

  lifecycle {
    ignore_changes = [content, bindings, compatibility_date, compatibility_flags]
  }
}

resource "cloudflare_d1_database" "main" {
  account_id = var.account_id
  name       = "enki-db"
}
