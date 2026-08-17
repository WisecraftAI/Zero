# Minimal GCP primitives for ZER0 (M7). Apply from a real project; not used by local npm start.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "name" {
  type    = string
  default = "zero"
}

provider "google" {
  project = var.project
  region  = var.region
}

resource "google_storage_bucket" "artifacts" {
  name     = "${var.project}-${var.name}-artifacts"
  location = var.region
}

resource "google_pubsub_topic" "runs_requested" {
  name = "${var.name}-runs-requested"
}

resource "google_pubsub_topic" "execution_requested" {
  name = "${var.name}-execution-requested"
}

resource "google_pubsub_topic" "execution_completed" {
  name = "${var.name}-execution-completed"
}

resource "google_pubsub_subscription" "runs_requested" {
  name  = "${var.name}-runs-requested-zero"
  topic = google_pubsub_topic.runs_requested.id
}

resource "google_pubsub_subscription" "execution_requested" {
  name  = "${var.name}-execution-requested-zero"
  topic = google_pubsub_topic.execution_requested.id
}

resource "google_secret_manager_secret" "key_enc" {
  secret_id = "${var.name}-KEY_ENC_SECRET"
  replication {
    auto {}
  }
}

resource "google_redis_instance" "cache" {
  name           = "${var.name}-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region
}

output "gcs_bucket" {
  value = google_storage_bucket.artifacts.name
}

output "pubsub_runs_requested" {
  value = google_pubsub_topic.runs_requested.name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}
