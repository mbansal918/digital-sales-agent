# infra/

Infrastructure as code and local development tooling.

| Directory | Description |
|---|---|
| `docker/` | Docker Compose stack for local development (Postgres, Redis, LocalStack) |
| `terraform/` | AWS infrastructure — VPC, ECS, RDS, ElastiCache, SQS, S3 |
| `k8s/` | Kubernetes manifests (alternative deployment target) |

## Environments

| Environment | Infrastructure | Deploy trigger |
|---|---|---|
| Local | Docker Compose + LocalStack | Manual (`docker compose up`) |
| Staging | AWS ECS (Fargate) | Push to `develop` branch |
| Production | AWS ECS (Fargate) | Push to `main` branch |

## First-time AWS setup

```bash
cd infra/terraform
terraform init
terraform plan -var="db_password=<secret>"
terraform apply -var="db_password=<secret>"
```

Terraform will create all required AWS resources and output the connection strings needed for the application's environment variables.
