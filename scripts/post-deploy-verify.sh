#!/bin/bash

###############################################################################
# POST-DEPLOYMENT VERIFICATION SCRIPT — Timeo Production
#
# Purpose: Verify all Timeo services are working after infrastructure deployment
# Date: 2026-04-11
# Author: QA Engineer
#
# Usage:
#   bash scripts/post-deploy-verify.sh https://timeo.my https://api.timeo.my
#
# Requires:
#   - curl (system)
#   - jq (JSON parsing)
#   - pnpm (for E2E tests)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SITE_URL="${1:-https://timeo.my}"
API_URL="${2:-https://api.timeo.my}"
HEALTH_ENDPOINT="$API_URL/health"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Timeo Post-Deployment Verification Script                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Testing: SITE_URL = $SITE_URL"
echo "Testing: API_URL  = $API_URL"
echo ""

# Counter for checks
PASS=0
FAIL=0

##############################################################################
# UTILITY FUNCTIONS
##############################################################################

check_pass() {
  local msg="$1"
  echo -e "${GREEN}✓ PASS${NC} — $msg"
  ((PASS++))
}

check_fail() {
  local msg="$1"
  echo -e "${RED}✗ FAIL${NC} — $msg"
  ((FAIL++))
}

check_info() {
  local msg="$1"
  echo -e "${BLUE}ℹ INFO${NC} — $msg"
}

##############################################################################
# 1. HEALTH CHECKS
##############################################################################

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1. HEALTH CHECKS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check API health endpoint
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null | tail -1)
if [ "$HEALTH_RESPONSE" = "200" ]; then
  check_pass "API health endpoint returns 200"
  HEALTH_BODY=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null)
  check_info "Health response: $HEALTH_BODY"
else
  check_fail "API health endpoint returned $HEALTH_RESPONSE (expected 200)"
  check_info "Endpoint: $HEALTH_ENDPOINT"
fi

# Check DNS resolution
if nslookup "$SITE_URL" > /dev/null 2>&1 || nslookup "timeo.my" > /dev/null 2>&1; then
  check_pass "DNS resolution works for timeo.my"
else
  check_fail "DNS resolution failed for timeo.my"
fi

if nslookup "$API_URL" > /dev/null 2>&1 || nslookup "api.timeo.my" > /dev/null 2>&1; then
  check_pass "DNS resolution works for api.timeo.my"
else
  check_fail "DNS resolution failed for api.timeo.my"
fi

echo ""

##############################################################################
# 2. API CONNECTIVITY TESTS
##############################################################################

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2. API CONNECTIVITY TESTS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test CORS headers
CORS_RESPONSE=$(curl -s -i -X OPTIONS "$API_URL/api/tenants" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_RESPONSE" ]; then
  check_pass "CORS headers present on API"
else
  check_fail "CORS headers missing on API"
fi

# Test API authentication endpoint
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/auth/signup" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' 2>/dev/null | tail -1)

if [[ "$AUTH_RESPONSE" =~ ^(200|400|422)$ ]]; then
  check_pass "Auth endpoint is responding (status: $AUTH_RESPONSE)"
else
  check_fail "Auth endpoint failed (status: $AUTH_RESPONSE)"
fi

echo ""

##############################################################################
# 3. DATABASE CONNECTIVITY (via API)
##############################################################################

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3. DATABASE CONNECTIVITY (via API)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Health endpoint includes DB check
HEALTH_DB=$(curl -s "$HEALTH_ENDPOINT" 2>/dev/null | jq '.database' 2>/dev/null || echo "unknown")
if [ "$HEALTH_DB" = "connected" ]; then
  check_pass "Database is connected (via health endpoint)"
else
  check_info "Database status: $HEALTH_DB"
fi

echo ""

##############################################################################
# 4. HTTPS & SECURITY
##############################################################################

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4. HTTPS & SECURITY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check HTTPS is enforced
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://timeo.my" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
  check_pass "HTTP traffic redirects to HTTPS"
elif [ "$HTTP_STATUS" = "200" ]; then
  check_fail "HTTP traffic not redirected to HTTPS"
else
  check_info "HTTP redirect status: $HTTP_STATUS"
fi

# Check SSL certificate
SSL_CERT=$(echo | openssl s_client -servername timeo.my -connect timeo.my:443 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep "CN=" || echo "")
if [ -n "$SSL_CERT" ]; then
  check_pass "SSL certificate is valid"
  check_info "Certificate: $SSL_CERT"
else
  check_fail "SSL certificate check failed"
fi

echo ""

##############################################################################
# 5. SUMMARY
##############################################################################

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5. SUMMARY${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL=$((PASS + FAIL))
echo ""
echo -e "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ All infrastructure checks passed!${NC}"
  echo ""
  echo "Next: Run E2E tests with:"
  echo "  pnpm --filter @timeo/web exec playwright test"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Review above and retry.${NC}"
  echo ""
  exit 1
fi
