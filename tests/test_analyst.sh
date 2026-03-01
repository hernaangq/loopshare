#!/bin/bash
# Test the Analyst Agent
# Usage: bash test_analyst.sh

echo "=== Testing Analyst Agent ==="
curl -s -X POST http://localhost:8000/api/agents/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "propertyName": "Willis Tower",
    "address": "233 S Wacker Dr"
  }' | python3 -m json.tool 2>/dev/null || echo "Raw response (no python3 json.tool available)"
