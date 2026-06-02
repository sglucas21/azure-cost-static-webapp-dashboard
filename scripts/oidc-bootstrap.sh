#!/usr/bin/env bash
set -euo pipefail

# Replace these values before running.
SUBSCRIPTION_ID="your-subscription-id"
GITHUB_ORG="your-github-username"
GITHUB_REPO="azure-cost-static-webapp-dashboard"

APP_NAME="github-oidc-${GITHUB_REPO}"
ROLE_NAME="Contributor"
SCOPE="/subscriptions/${SUBSCRIPTION_ID}"

echo "Creating Microsoft Entra app registration..."
APP_ID=$(az ad app create --display-name "${APP_NAME}" --query appId -o tsv)

echo "Creating service principal..."
az ad sp create --id "${APP_ID}" > /dev/null

echo "Assigning Azure role..."
az role assignment create \
  --assignee "${APP_ID}" \
  --role "${ROLE_NAME}" \
  --scope "${SCOPE}"

echo "Creating federated credential for GitHub Actions main branch..."
az ad app federated-credential create \
  --id "${APP_ID}" \
  --parameters "{
    \"name\": \"github-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
    \"description\": \"GitHub Actions OIDC for main branch\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

TENANT_ID=$(az account show --query tenantId -o tsv)

echo ""
echo "Add these as GitHub repository secrets:"
echo "AZURE_CLIENT_ID=${APP_ID}"
echo "AZURE_TENANT_ID=${TENANT_ID}"
echo "AZURE_SUBSCRIPTION_ID=${SUBSCRIPTION_ID}"
