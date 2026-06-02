variable "subscription_id" {
  description = "Azure subscription ID."
  type        = string
}

variable "project_name" {
  description = "Short project name used in Azure resource names."
  type        = string
  default     = "costdash"
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "eastus2"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "lab"
}

variable "owner" {
  description = "Resource owner."
  type        = string
  default     = "Steven"
}
