output "pages_project_name" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.frontend.name
}

output "pages_subdomain" {
  description = "Cloudflare Pages subdomain"
  value       = "${cloudflare_pages_project.frontend.name}.pages.dev"
}

output "backend_worker_name" {
  description = "Backend Worker script name"
  value       = cloudflare_workers_script.backend.script_name
}

output "agents_worker_name" {
  description = "Agents Worker script name"
  value       = cloudflare_workers_script.agents.script_name
}

output "d1_database_id" {
  description = "D1 database ID for enki-db"
  value       = cloudflare_d1_database.main.id
}

output "backend_custom_domain" {
  description = "Backend Worker custom domain"
  value       = cloudflare_workers_custom_domain.backend.hostname
}

output "agents_custom_domain" {
  description = "Agents Worker custom domain"
  value       = cloudflare_workers_custom_domain.agents.hostname
}
