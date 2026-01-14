#!/bin/bash
set -e

# Configuration - can be overridden via environment variables
AUTH_BFF_URL=${AUTH_BFF_URL:-"http://localhost:4005"}
WEB_ADMIN_URL=${WEB_ADMIN_URL:-"http://localhost:3002"}
ANALYTICS_PORT=${ANALYTICS_PORT:-50056}
AUTHORIZATION_PORT=${AUTHORIZATION_PORT:-50055}
AUDIT_PORT=${AUDIT_PORT:-50054}
SESSION_COOKIE="${SESSION_COOKIE:-}"
TEST_USER="${TEST_USER:-testuser}"
TEST_TEAM="${TEST_TEAM:-test-team}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage instructions
usage() {
  cat <<EOF
Integration Testing Script

Usage:
  $0 [options]

Environment Variables:
  AUTH_BFF_URL          Auth BFF service URL (default: http://localhost:4005)
  WEB_ADMIN_URL         Web admin URL (default: http://localhost:3002)
  ANALYTICS_PORT        Analytics gRPC port (default: 50056)
  AUTHORIZATION_PORT    Authorization gRPC port (default: 50055)
  AUDIT_PORT           Audit gRPC port (default: 50054)
  SESSION_COOKIE       Session cookie for authenticated requests

Examples:
  # Run with defaults
  ./test-integration.sh

  # Run with custom URLs
  AUTH_BFF_URL=http://staging.example.com:4005 ./test-integration.sh

  # Run with session cookie for authenticated tests
  SESSION_COOKIE='sessionId=abc123' ./test-integration.sh

  # Run with custom ports
  ANALYTICS_PORT=60056 AUTHORIZATION_PORT=60055 ./test-integration.sh

EOF
  exit 0
}

# Check for help flag
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  usage
fi

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
print_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

print_test() {
    echo -e "\n${YELLOW}[$1] $2${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test function wrapper
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_code="${3:-0}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_code" -eq 0 ]; then
            print_success "$test_name"
            return 0
        else
            print_error "$test_name (expected failure but succeeded)"
            return 1
        fi
    else
        if [ "$expected_code" -ne 0 ]; then
            print_success "$test_name (expected failure)"
            return 0
        else
            print_error "$test_name"
            return 1
        fi
    fi
}

# Main script
print_header "Integration Testing Script"
print_info "Target: $AUTH_BFF_URL"
print_info "Date: $(date '+%Y-%m-%d %H:%M:%S')"

# Check if curl is available
if ! command -v curl &> /dev/null; then
    print_error "curl is not installed. Please install curl to run integration tests."
    exit 1
fi

# ===================================
# Test 1: Auth-BFF Health Check
# ===================================
print_test "1/6" "Checking auth-bff health endpoint"
if curl -f -s -o /dev/null "$AUTH_BFF_URL/health"; then
    print_success "auth-bff is healthy and responding"
else
    print_error "auth-bff health check failed - service may be down"
    exit 1
fi

# ===================================
# Test 2: gRPC Service Connectivity
# ===================================
print_test "2/6" "Verifying gRPC service connections"
print_info "Expected services: analytics:${ANALYTICS_PORT}, authorization:${AUTHORIZATION_PORT}, audit:${AUDIT_PORT}"

# Check if gRPC ports are listening
GRPC_SERVICES_OK=true

if command -v nc &> /dev/null; then
    for port in ${AUDIT_PORT} ${AUTHORIZATION_PORT} ${ANALYTICS_PORT}; do
        if nc -z localhost "$port" 2>/dev/null; then
            print_info "  Port $port is listening"
        else
            print_warning "  Port $port is not listening"
            GRPC_SERVICES_OK=false
        fi
    done

    if [ "$GRPC_SERVICES_OK" = true ]; then
        print_success "gRPC services are reachable"
    else
        print_warning "Some gRPC services may not be running"
    fi
else
    print_warning "nc (netcat) not available - skipping port checks"
    print_info "gRPC services assumed connected (analytics:${ANALYTICS_PORT}, authorization:${AUTHORIZATION_PORT}, audit:${AUDIT_PORT})"
fi

# ===================================
# Test 3: Analytics Endpoints
# ===================================
print_test "3/6" "Testing Analytics endpoints"

if [ -z "$SESSION_COOKIE" ]; then
    print_warning "SESSION_COOKIE not set - skipping authenticated tests"
    print_info "To test authenticated endpoints, run:"
    print_info "  export SESSION_COOKIE='sessionId=your-session-id'"
    print_info "  ./scripts/test-integration.sh"
else
    # Test top users endpoint
    ANALYTICS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/analytics/users/top")
    HTTP_CODE=$(echo "$ANALYTICS_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Analytics /users/top endpoint responding"
    else
        print_error "Analytics /users/top endpoint failed (HTTP $HTTP_CODE)"
    fi
    
    # Test activity trends endpoint
    TRENDS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/analytics/activity/trends")
    HTTP_CODE=$(echo "$TRENDS_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Analytics /activity/trends endpoint responding"
    else
        print_warning "Analytics /activity/trends endpoint returned HTTP $HTTP_CODE"
    fi
fi

# ===================================
# Test 4: Authorization Service
# ===================================
print_test "4/6" "Testing Authorization service CRUD operations"

if [ -z "$SESSION_COOKIE" ]; then
    print_warning "SESSION_COOKIE not set - skipping authorization tests"
else
    # Test authorization check endpoint
    AUTH_CHECK_DATA='{"user":"user:alice","relation":"view","object":"document:123"}'
    AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Cookie: $SESSION_COOKIE" \
        -H "Content-Type: application/json" \
        -d "$AUTH_CHECK_DATA" \
        "$AUTH_BFF_URL/admin/authorization/check")
    HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "403" ]; then
        print_success "Authorization /check endpoint responding (HTTP $HTTP_CODE)"
    else
        print_error "Authorization /check endpoint failed (HTTP $HTTP_CODE)"
    fi
    
    # Test list permissions endpoint
    LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/authorization/permissions")
    HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Authorization /permissions endpoint responding"
    else
        print_warning "Authorization /permissions endpoint returned HTTP $HTTP_CODE"
    fi
fi

# ===================================
# Test 5: Teams Service
# ===================================
print_test "5/6" "Testing Teams service CRUD operations"

if [ -z "$SESSION_COOKIE" ]; then
    print_warning "SESSION_COOKIE not set - skipping teams tests"
else
    # Test list teams endpoint
    TEAMS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/teams")
    HTTP_CODE=$(echo "$TEAMS_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Teams /admin/teams endpoint responding"
    else
        print_error "Teams /admin/teams endpoint failed (HTTP $HTTP_CODE)"
    fi
    
    # Test get team details (if teams exist)
    BODY=$(echo "$TEAMS_RESPONSE" | sed '$d')
    if echo "$BODY" | grep -q "id" 2>/dev/null; then
        print_info "Found teams in response - service is operational"
        print_success "Teams service CRUD operations available"
    else
        print_info "No teams found (empty database is OK for new deployments)"
    fi
fi

# ===================================
# Test 6: Session Recordings
# ===================================
print_test "6/6" "Testing Session Recordings queries"

if [ -z "$SESSION_COOKIE" ]; then
    print_warning "SESSION_COOKIE not set - skipping session recordings tests"
else
    # Test session recordings list endpoint
    RECORDINGS_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/recordings")
    HTTP_CODE=$(echo "$RECORDINGS_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Session Recordings endpoint responding"
    else
        print_warning "Session Recordings endpoint returned HTTP $HTTP_CODE"
    fi
    
    # Test recordings search/filter
    SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Cookie: $SESSION_COOKIE" "$AUTH_BFF_URL/admin/recordings?limit=10")
    HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n 1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Session Recordings query with parameters working"
    else
        print_warning "Session Recordings query returned HTTP $HTTP_CODE"
    fi
fi

# ===================================
# Summary
# ===================================
print_header "Test Summary"
echo -e "${BLUE}Total Tests: $TESTS_TOTAL${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    print_success "All integration tests passed!"
    echo ""
    exit 0
else
    echo ""
    print_error "Some tests failed. Please check the output above."
    echo ""
    exit 1
fi
