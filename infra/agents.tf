resource "cloudflare_workers_script" "agents" {
  account_id  = var.account_id
  script_name = "enki-agents"

  # Placeholder content — Wrangler deploys the real code
  content = "addEventListener('fetch', event => { event.respondWith(new Response('ok')) })"

  lifecycle {
    ignore_changes = [content, bindings, compatibility_date, compatibility_flags]
  }
}

resource "cloudflare_workers_custom_domain" "agents" {
  account_id = var.account_id
  zone_id    = data.cloudflare_zone.main.zone_id
  hostname   = "agents.${var.domain}"
  service    = cloudflare_workers_script.agents.script_name
}
