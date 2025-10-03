#!/bin/bash

# Netlify deployment script for the dashboard
# Usage: ./deploy-dashboard.sh

echo "🚀 Deploying Dental Insurance Analytics Dashboard to Netlify..."
echo ""

cd "$(dirname "$0")/dental-insurance-analytics-dashboard"

# Deploy to production
netlify deploy --prod

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: https://summary-21-payors-list.netlify.app"
