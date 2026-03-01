#!/bin/bash
# Test the Matcher Agent
# Usage: bash test_matcher.sh

echo "=== Testing Matcher Agent ==="
curl -s -X POST http://localhost:8000/api/agents/match \
  -H "Content-Type: application/json" \
  -d '{
    "company": "TechStart Chicago",
    "sector": "Software",
    "days": ["Monday", "Wednesday"],
    "people": 8,
    "budget": 2000,
    "zone": "North Loop"
  }' | python3 -m json.tool 2>/dev/null || echo "Raw response"
