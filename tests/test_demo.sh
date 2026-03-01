#!/bin/bash
# Test the full demo endpoint (no form needed)
# Usage: bash test_demo.sh

echo "=== Running Full Demo (GET /api/demo) ==="
echo "This runs the full orchestrator with TechStart Chicago sample data."
echo "Make sure GROQ_API_KEY is exported first."
echo "Expected time: 30-60 seconds (Groq is fast)..."
echo ""

curl -s http://localhost:8000/api/demo | python3 -m json.tool 2>/dev/null || echo "Raw response"
