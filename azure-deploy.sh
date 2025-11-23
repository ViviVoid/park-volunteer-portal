#!/bin/bash
# Quick deployment script for Azure Container Apps
# Make sure you have Azure CLI installed and logged in: az login

set -e

# Configuration - Update these values
RESOURCE_GROUP="park-volunteer-portal-rg"
LOCATION="northcentralus"
CONTAINER_APP_NAME="park-volunteer-portal"
REGISTRY_NAME="parkvolunteerportal"
IMAGE_NAME="park-volunteer-portal:latest"

echo "🚀 Starting Azure deployment..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first: https://aka.ms/InstallAzureCLI"
    exit 1
fi

# Login check
echo "📋 Checking Azure login status..."
az account show &> /dev/null || {
    echo "⚠️  Not logged in to Azure. Please run: az login"
    exit 1
}

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none || true

# Create Azure Container Registry if it doesn't exist
echo "🏗️  Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --admin-enabled true --output none || true

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "📝 ACR Login Server: $ACR_LOGIN_SERVER"

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t $ACR_LOGIN_SERVER/$IMAGE_NAME .

echo "📤 Pushing image to Azure Container Registry..."
az acr login --name $REGISTRY_NAME
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME

# Create Container Apps environment if it doesn't exist
echo "🌍 Creating Container Apps environment..."
ENV_NAME="${CONTAINER_APP_NAME}-env"
az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output none || true

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

# Create or update Container App
echo "🚢 Deploying Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --image $ACR_LOGIN_SERVER/$IMAGE_NAME \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 5000 \
  --ingress external \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars "NODE_ENV=production" \
  --output none || \
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/$IMAGE_NAME \
  --output none

# Get the app URL
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn --output tsv)

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://$APP_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Set environment variables in Azure Portal or using:"
echo "      az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --set-env-vars 'KEY=VALUE'"
echo "   2. Configure your environment variables (JWT_SECRET, SMTP_*, TWILIO_*, etc.)"
echo "   3. Update CLIENT_URL to: https://$APP_URL"

