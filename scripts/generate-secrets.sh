#!/usr/bin/env bash
#
# Generate secure random secrets for Timeo production deployment.
# Run this locally and copy the values into your Dokploy environment variables.
#

set -euo pipefail

echo "=== Timeo Production Secrets ==="
echo ""
echo "Copy these values into your Dokploy service environment variables."
echo "Use the SAME BETTER_AUTH_SECRET for both the API and Web services."
echo ""
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo ""
echo "=== Done ==="
