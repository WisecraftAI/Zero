# Minimal AWS primitives for ZER0 (M7). Apply from a real account; not used by local npm start.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type    = string
  default = "zero"
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.name}-artifacts"
}

resource "aws_sqs_queue" "runs_requested" {
  name = "${var.name}-runs-requested"
}

resource "aws_sqs_queue" "execution_requested" {
  name = "${var.name}-execution-requested"
}

resource "aws_sqs_queue" "execution_completed" {
  name = "${var.name}-execution-completed"
}

resource "aws_secretsmanager_secret" "app" {
  name = "${var.name}/KEY_ENC_SECRET"
}

variable "subnet_ids" {
  type    = list(string)
  default = []
}

resource "aws_elasticache_subnet_group" "cache" {
  count      = length(var.subnet_ids) > 0 ? 1 : 0
  name       = "${var.name}-redis"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_cluster" "cache" {
  count                = length(var.subnet_ids) > 0 ? 1 : 0
  cluster_id           = "${var.name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.cache[0].name
}

output "s3_bucket" {
  value = aws_s3_bucket.artifacts.id
}

output "sqs_runs_requested" {
  value = aws_sqs_queue.runs_requested.id
}

output "sqs_execution_requested" {
  value = aws_sqs_queue.execution_requested.id
}

output "sqs_execution_completed" {
  value = aws_sqs_queue.execution_completed.id
}
