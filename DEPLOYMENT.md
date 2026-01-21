# Deployment Configuration Files

This directory contains configuration files for deploying the PRM system to production.

## Files

### `render.yaml`
Configuration for deploying the Python backend to Render.

### `front-end/vercel.json`
Configuration for deploying the React frontend to Vercel.

### `front-end/.env.production.example`
Template for production environment variables. Copy to `.env.production` and fill in values.

## Quick Start

1. **MongoDB Atlas**: Set up free cluster and get connection string
2. **Render**: Deploy backend using `render.yaml`
3. **Vercel**: Deploy frontend from `front-end/` directory

See [`deployment_guide.md`](file:///C:/Users/Admin/.gemini/antigravity/brain/29d2aa18-2df4-419f-9ea6-9de91f4a6f25/deployment_guide.md) for detailed instructions.
