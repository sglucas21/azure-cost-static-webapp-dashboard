# Step-by-Step Deployment Guide

## Phase 1: Prerequisites

Install these tools locally:

- Git
- VS Code
- Azure CLI
- Terraform
- Node.js LTS

You also need:

- Azure subscription
- GitHub account
- GitHub repository for this project

## Phase 2: Create the GitHub Repository

1. Create a new GitHub repository named:

```text
azure-cost-static-webapp-dashboard
```

2. Clone the repository locally.
3. Copy these project files into the repository.
4. Commit and push the files.

## Phase 3: Configure Azure OIDC for GitHub Actions

OIDC lets GitHub Actions authenticate to Azure without storing a long-lived Azure client secret.

1. Open `scripts/oidc-bootstrap.sh`
2. Replace the placeholder values:

```bash
SUBSCRIPTION_ID="your-subscription-id"
GITHUB_ORG="your-github-username"
GITHUB_REPO="azure-cost-static-webapp-dashboard"
```

3. Run:

```bash
chmod +x scripts/oidc-bootstrap.sh
./scripts/oidc-bootstrap.sh
```

The script outputs these values:

- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID

## Phase 4: Add GitHub Secrets and Variables

In GitHub, go to:

```text
Settings > Secrets and variables > Actions
```

Create these repository secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Later, after creating the Static Web App, also add:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
```

## Phase 5: Configure Terraform Variables

Copy the example file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit the values:

```hcl
project_name = "costdash"
location     = "eastus2"
environment  = "lab"
owner         = "Steven"
```

## Phase 6: Run Terraform from GitHub Actions

Go to GitHub Actions and run:

```text
Terraform Deploy
```

This creates:

- Azure Resource Group
- Azure Static Web App
- Tags

## Phase 7: Get Static Web App Deployment Token

In Azure Portal:

1. Open the Static Web App
2. Go to **Manage deployment token**
3. Copy the token
4. Add it as a GitHub repository secret:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
```

## Phase 8: Deploy the React App and API

Go to GitHub Actions and run:

```text
Deploy Static Web App
```

This deploys:

- React dashboard from `/app`
- Azure Functions API from `/api`

## Phase 9: Open the Website

After deployment, open the Static Web App URL from the GitHub Actions output or Azure Portal.

The dashboard should display:

- Current spend
- Monthly budget
- Budget utilization
- Weekly trend
- Top cost drivers
- Cost by category

## Phase 10: Cleanup

To remove Azure resources:

```bash
cd terraform
terraform destroy
```

Or delete the resource group from Azure Portal.
