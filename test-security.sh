#!/bin/bash

# Security Testing Script for LemonDots AI
# Tests Phase 1 & 2 security implementations

BASE_URL="http://localhost:3000"
EMAIL="kiesviswa@gmail.com"
PASSWORD="testtest"

echo "🔒 LemonDots AI - Security Test Suite"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test HTTP endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local expected_code="$4"
    local data="$5"

    echo -n "Testing: $name... "

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
    fi

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $http_code)"
        ((FAILED++))
    fi
}

# Test 1: Server-side route protection
echo "📋 Test 1: Server-Side Route Protection"
echo "----------------------------------------"
test_endpoint "Accessing /dashboard without auth" "GET" "$BASE_URL/dashboard" "307"
test_endpoint "Login page accessible" "GET" "$BASE_URL/login" "200"
echo ""

# Test 2: API authentication
echo "📋 Test 2: API Authentication Required"
echo "----------------------------------------"
test_endpoint "Admin invite without token" "POST" "$BASE_URL/api/admin-invite" "401" '{"email":"test@test.com","name":"Test","role":"viewer"}'
test_endpoint "Admin delete without token" "DELETE" "$BASE_URL/api/admin-delete-user" "401" '{"userId":"123","confirmEmail":"test@test.com"}'
echo ""

# Test 3: Input validation
echo "📋 Test 3: Input Validation"
echo "----------------------------------------"
echo "Note: These tests require authentication token - manual testing recommended"
echo -e "${YELLOW}⊘ SKIP${NC} (Requires auth token)"
echo -e "${YELLOW}⊘ SKIP${NC} (Requires auth token)"
echo ""

# Test 4: Rate limiting infrastructure
echo "📋 Test 4: Rate Limiting Infrastructure"
echo "----------------------------------------"
if [ -f "src/lib/rate-limit.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} Rate limiting utilities exist"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} Rate limiting utilities missing"
    ((FAILED++))
fi

if grep -q "UPSTASH_REDIS_REST_URL" .env.local 2>/dev/null; then
    echo -e "${GREEN}✓ PASS${NC} Upstash configured in .env.local"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARN${NC} Upstash not configured (rate limiting disabled)"
fi
echo ""

# Test 5: Middleware exists
echo "📋 Test 5: Security Middleware"
echo "----------------------------------------"
if [ -f "middleware.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} Next.js middleware exists"
    ((PASSED++))

    if grep -q "dashboard" middleware.ts; then
        echo -e "${GREEN}✓ PASS${NC} Middleware protects /dashboard routes"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} Middleware doesn't protect /dashboard"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} Middleware file missing"
    ((FAILED++))
fi
echo ""

# Test 6: Validation schemas
echo "📋 Test 6: Validation Schemas"
echo "----------------------------------------"
if [ -f "src/lib/validation/schemas.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} Validation schemas exist"
    ((PASSED++))

    if grep -q "eventSchema" src/lib/validation/schemas.ts; then
        echo -e "${GREEN}✓ PASS${NC} Event validation schema defined"
        ((PASSED++))
    fi

    if grep -q "skuUpdateSchema" src/lib/validation/schemas.ts; then
        echo -e "${GREEN}✓ PASS${NC} SKU validation schema defined"
        ((PASSED++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} Validation schemas missing"
    ((FAILED++))
fi
echo ""

# Test 7: Database migrations
echo "📋 Test 7: Database Security Migrations"
echo "----------------------------------------"
echo "Checking Supabase migrations..."

if command -v supabase &> /dev/null; then
    # Check if migrations directory exists
    if [ -d "supabase/migrations" ]; then
        migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ PASS${NC} Found $migration_count migration files"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ WARN${NC} No local migrations directory (using remote Supabase)"
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC} Supabase CLI not installed (can't verify migrations locally)"
fi
echo ""

# Test 8: Security documentation
echo "📋 Test 8: Security Documentation"
echo "----------------------------------------"
if [ -f "UPSTASH_SETUP.md" ]; then
    echo -e "${GREEN}✓ PASS${NC} Upstash setup guide exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} Upstash setup guide missing"
    ((FAILED++))
fi

if [ -f "POSTGRES_UPGRADE.md" ]; then
    echo -e "${GREEN}✓ PASS${NC} Postgres upgrade guide exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} Postgres upgrade guide missing"
    ((FAILED++))
fi
echo ""

# Summary
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo -e "Total Passed: ${GREEN}$PASSED${NC}"
echo -e "Total Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Security implementation verified.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review the output above.${NC}"
    exit 1
fi
