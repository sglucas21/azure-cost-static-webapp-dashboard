# Azure Cost Visibility Dashboard - Static Web App Version

## Overview

This project deploys a public Azure Static Web App that displays a sample Azure cost visibility dashboard. It is designed as a portfolio project for Azure administration, cloud automation, FinOps, Terraform, and GitHub Actions.

## Architecture

GitHub Actions deploys the React front end and Azure Functions API to Azure Static Web Apps. Terraform creates the Azure resource group and Static Web App resource.

```text
GitHub Repository
      ↓
GitHub Actions
      ↓
Terraform Infrastructure Deployment
      ↓
Azure Static Web App
      ↓
React Dashboard + Managed Azure Functions API
```

## What This Demonstrates

- Azure Static Web Apps
- React dashboard development
- Azure Functions API
- Terraform infrastructure as code
- GitHub Actions deployment
- FinOps/cost visibility concepts
- Cloud automation portfolio documentation

## Important Note

This starter version uses mock cost data from the Azure Function API. That makes it safe and low-cost for portfolio use. A future enhancement can connect the API to the Azure Cost Management API.

## Project Structure

```text
azure-cost-static-webapp-dashboard/
├── .github/workflows/
│   ├── terraform.yml
│   └── static-web-app.yml
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── app/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       └── style.css
├── api/
│   ├── host.json
│   ├── package.json
│   └── GetCostSummary/
│       ├── function.json
│       └── index.js
├── docs/
│   ├── deployment-guide.md
│   ├── portfolio-writeup.md
│   └── future-enhancements.md
└── scripts/
    └── oidc-bootstrap.sh
```

## Deployment Summary

1. Create an Azure subscription.
2. Create GitHub repository secrets/variables.
3. Run the OIDC bootstrap script.
4. Update Terraform variables.
5. Push to GitHub.
6. Run the Terraform workflow.
7. Add the Static Web App deployment token to GitHub.
8. Run the Static Web App deployment workflow.

See `docs/deployment-guide.md` for full steps.
