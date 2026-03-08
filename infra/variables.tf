variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "enki.cr"
}

variable "openrouter_api_key" {
  description = "OpenRouter API key for agent LLM calls"
  type        = string
  sensitive   = true
}
