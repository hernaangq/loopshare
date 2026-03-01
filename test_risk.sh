#!/bin/bash
# Test the Risk Agent
# Usage: bash test_risk.sh

echo "=== Testing Risk Agent ==="
curl -s -X POST http://localhost:8000/api/agents/risk \
  -H "Content-Type: application/json" \
  -d '{
    "corporateName": "Kirkland & Ellis",
    "address": "300 N LaSalle St",
    "startupName": "TechStart Chicago"
  }' | python3 -m json.tool 2>/dev/null || echo "Raw response"
