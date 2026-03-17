# infra/terraform/

AWS infrastructure for staging and production environments.

## Resources provisioned

| Resource | Type | Purpose |
|---|---|---|
| VPC | `aws_vpc` | Isolated network with public + private subnets across 2 AZs |
| SQS FIFO Queue | `aws_sqs_queue` | Event bus (with dead-letter queue) |
| S3 Bucket | `aws_s3_bucket` | Media assets (brochures, photos, pricing guides) |
| ElastiCache (Redis) | `aws_elasticache_replication_group` | Context store hot tier, Multi-AZ |
| RDS (Postgres 16) | `aws_db_instance` | Durable data store, encrypted, daily backups |
| ECS Cluster | *(to be added)* | Container orchestration for all services |
| ECR Repositories | *(to be added)* | Docker image registry per service |
| ALB | *(to be added)* | Load balancer for gateway and admin-ui |

## Outputs used by CI/CD

After `terraform apply`, the following outputs are used to configure deployed services:

| Output | Used by |
|---|---|
| `sqs_queue_url` | All services (event bus) |
| `redis_endpoint` | Orchestrator (context store) |
| `db_endpoint` | Orchestrator, CRM Service, Workflow, DB migrations |
| `media_bucket` | Channel adapters (media URLs) |

## State management

Terraform state is stored in S3 (`your-tfstate-bucket`). Update the bucket name in `main.tf` before running for the first time.

## Sensitive variables

`db_password` is marked `sensitive = true` and must be passed at apply time or stored in a secrets manager. Never commit it to the repository.

```bash
# Pass directly (not recommended for CI)
terraform apply -var="db_password=my-secret"

# Better: use AWS Secrets Manager or a .tfvars file outside the repo
terraform apply -var-file="/path/to/secrets.tfvars"
```
