# Azure Deployment Guide

This guide will help you deploy the Park Volunteer Portal to Azure Container Apps.

## Prerequisites

1. **Azure Account**: Sign up at [azure.com](https://azure.com) if you don't have one
2. **Azure CLI**: Install from [aka.ms/InstallAzureCLI](https://aka.ms/InstallAzureCLI)
3. **Docker**: Install from [docker.com](https://docker.com)

## Quick Deploy (Automated Script)

The easiest way to deploy is using the provided script:

```bash
# Make the script executable
chmod +x azure-deploy.sh

# Run the deployment script
./azure-deploy.sh
```

The script will:
- Create a resource group
- Create an Azure Container Registry
- Build and push your Docker image
- Create a Container Apps environment
- Deploy your application

## Manual Deployment Steps

### 1. Login to Azure

```bash
az login
```

### 2. Set Configuration Variables

Update these in `azure-deploy.sh` or set them as environment variables:

```bash
export RESOURCE_GROUP="park-volunteer-portal-rg"
export LOCATION="northcentralus"
export CONTAINER_APP_NAME="park-volunteer-portal"
export REGISTRY_NAME="parkvolunteerportal"
```

### 3. Create Resource Group

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 4. Create Azure Container Registry

```bash
az acr create --resource-group $RESOURCE_GROUP \
  --name $REGISTRY_NAME \
  --sku Basic \
  --admin-enabled true
```

### 5. Build and Push Docker Image

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)

# Login to ACR
az acr login --name $REGISTRY_NAME

# Build image
docker build -t $ACR_LOGIN_SERVER/park-volunteer-portal:latest .

# Push image
docker push $ACR_LOGIN_SERVER/park-volunteer-portal:latest
```

### 6. Create Container Apps Environment

```bash
az containerapp env create \
  --name park-volunteer-portal-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 7. Deploy Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

# Create the container app
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment park-volunteer-portal-env \
  --image $ACR_LOGIN_SERVER/park-volunteer-portal:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 5000 \
  --ingress external \
  --cpu 1.0 \
  --memory 2.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars "NODE_ENV=production"
```

### 8. Configure Environment Variables

Set all required environment variables:

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    "JWT_SECRET=your-secret-key" \
    "SMTP_HOST=smtp.gmail.com" \
    "SMTP_PORT=587" \
    "SMTP_USER=your-email@gmail.com" \
    "SMTP_PASS=your-app-password" \
    "TWILIO_ACCOUNT_SID=your-twilio-sid" \
    "TWILIO_AUTH_TOKEN=your-twilio-token" \
    "TWILIO_PHONE_NUMBER=your-twilio-number" \
    "GOOGLE_CLIENT_ID=your-google-client-id" \
    "GOOGLE_CLIENT_SECRET=your-google-client-secret" \
    "GOOGLE_REDIRECT_URI=https://your-app-url.azurecontainerapps.io/api/admin/google/callback" \
    "CLIENT_URL=https://your-app-url.azurecontainerapps.io"
```

Or set them one by one:

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "JWT_SECRET=your-secret-key"
```

### 9. Get Your App URL

```bash
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## Using Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com)
2. Create a new **Container App**
3. Select or create a Container Apps environment
4. Configure:
   - **Image**: Your ACR image URL
   - **Port**: 5000
   - **Ingress**: External, enabled
   - **Environment variables**: Add all required variables
5. Review and create

## Updating the Deployment

To update your app after making changes:

```bash
# Rebuild and push
docker build -t $ACR_LOGIN_SERVER/park-volunteer-portal:latest .
docker push $ACR_LOGIN_SERVER/park-volunteer-portal:latest

# Update the container app
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/park-volunteer-portal:latest
```

## Persistent Storage

The SQLite database and uploads are stored in the container. For production, consider:

1. **Azure Files**: Mount a file share for persistent storage
2. **Azure Database**: Migrate to Azure SQL Database or PostgreSQL

To mount Azure Files:

```bash
# Create storage account and file share
STORAGE_ACCOUNT="parkvolunteerstorage"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

az storage share create \
  --name appdata \
  --account-name $STORAGE_ACCOUNT

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query "[0].value" --output tsv)

# Update container app with volume mount
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT" "AZURE_STORAGE_KEY=$STORAGE_KEY"
```

## Monitoring

View logs:

```bash
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow
```

## Cost Optimization

- **Free Tier**: Azure Container Apps has a free tier with limited resources
- **Scaling**: Set `--min-replicas 0` to scale to zero when not in use
- **Resource Limits**: Adjust CPU and memory based on usage

## Troubleshooting

### Container won't start
- Check logs: `az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP`
- Verify environment variables are set correctly
- Ensure database can be initialized

### Can't access the app
- Check ingress is enabled: `az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress`
- Verify the port is correct (5000)
- Check firewall rules if applicable

### Database issues
- SQLite files are ephemeral in containers - use persistent storage for production
- Check file permissions in the container

## Next Steps

1. Set up a custom domain
2. Configure SSL/TLS (automatic with Azure Container Apps)
3. Set up monitoring and alerts
4. Configure backup strategy for database
5. Set up CI/CD pipeline using `azure-deploy.yml`

