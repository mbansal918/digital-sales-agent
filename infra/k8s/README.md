# infra/k8s/

Kubernetes manifests — an alternative to ECS for teams that prefer to self-manage or already operate a Kubernetes cluster (e.g. EKS, GKE, DigitalOcean).

## Status

Placeholder. Manifests to be added when a Kubernetes deployment target is confirmed.

## Planned manifests

```
k8s/
  namespace.yaml
  configmap.yaml             # Non-secret environment config
  secrets.yaml               # Template only — real secrets managed by Sealed Secrets or External Secrets
  deployments/
    gateway.yaml
    orchestrator.yaml
    agent.yaml
    workflow.yaml
    crm-service.yaml
    admin-ui.yaml
  services/
    gateway-svc.yaml
    admin-ui-svc.yaml
  ingress/
    ingress.yaml             # ALB or nginx ingress controller
  hpa/
    gateway-hpa.yaml         # Horizontal Pod Autoscaler
    orchestrator-hpa.yaml
    agent-hpa.yaml
```

## Secrets management

Do not commit real secrets to this directory. Use one of:
- **AWS Secrets Manager + External Secrets Operator** (recommended for EKS)
- **Sealed Secrets** (good for GitOps workflows)
- **HashiCorp Vault** (if already in use)
