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
