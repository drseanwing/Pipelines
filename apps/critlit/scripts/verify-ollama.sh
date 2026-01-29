#!/bin/bash
# REdI | CritLit - Ollama Verification Script
set -e

echo "=== REdI | Ollama Verification ==="
echo ""

# REdI brand colors for output
CORAL='\033[38;2;229;91;100m'
NAVY='\033[38;2;27;58;95m'
TEAL='\033[38;2;43;158;158m'
RED='\033[38;2;220;53;69m'
GREEN='\033[38;2;40;167;69m'
YELLOW='\033[38;2;255;193;7m'
NC='\033[0m' # No Color

# Pre-check: Ensure Ollama container is running
if ! docker ps | grep -q slr_ollama; then
    echo -e "${RED}✗${NC} Ollama container is not running"
    echo "Start services with: ./start.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} Ollama container is running"
echo ""

# Check if Ollama API is responding
echo "1. Checking Ollama API connection..."
if curl -s --max-time 5 http://localhost:7362/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama API is responding${NC}"
else
    echo -e "${RED}✗ Ollama API is not responding at http://localhost:7362${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Check if Docker containers are running: docker compose ps"
    echo "  2. Check Ollama logs: docker compose logs ollama"
    echo "  3. Try restarting: docker compose restart ollama"
    exit 1
fi

echo ""
echo "2. Checking installed models..."
MODELS=$(curl -s http://localhost:7362/api/tags | jq -r '.models[] | .name' 2>/dev/null || echo "")

if [ -z "$MODELS" ]; then
    echo -e "${YELLOW}⚠ No models installed${NC}"
    echo ""
    echo "To install the llama3.1:8b model, run:"
    echo -e "${YELLOW}  docker compose exec ollama ollama pull llama3.1:8b${NC}"
    echo ""
    echo "Or for a smaller model (faster, less capable):"
    echo "  docker compose exec ollama ollama pull llama3.1"
    exit 1
else
    echo -e "${GREEN}✓ Found installed models:${NC}"
    echo "$MODELS" | while read -r model; do
        echo "  - $model"
    done
fi

echo ""
echo "3. Testing model generation..."

# Check if llama3.1 model is available (any variant)
if echo "$MODELS" | grep -q "llama3.1"; then
    MODEL=$(echo "$MODELS" | grep "llama3.1" | head -n 1)
    echo "Using model: $MODEL"

    RESPONSE=$(curl -s http://localhost:7362/api/generate -d '{
        "model": "'"$MODEL"'",
        "prompt": "Say hello in one sentence.",
        "stream": false
    }')

    if [ -n "$RESPONSE" ]; then
        GENERATED=$(echo "$RESPONSE" | jq -r '.response' 2>/dev/null || echo "")
        if [ -n "$GENERATED" ]; then
            echo -e "${GREEN}✓ Model generation successful${NC}"
            echo "Response: $GENERATED"
        else
            echo -e "${RED}✗ Model generation failed${NC}"
            echo "Raw response: $RESPONSE"
        fi
    else
        echo -e "${RED}✗ No response from model${NC}"
    fi
else
    echo -e "${YELLOW}⚠ llama3.1 model not found${NC}"
    echo "Available models: $MODELS"
    echo ""
    echo "To install llama3.1:8b, run:"
    echo -e "${YELLOW}  docker compose exec ollama ollama pull llama3.1:8b${NC}"
fi

echo ""
echo "4. Checking GPU status..."

# Try to check GPU via nvidia-smi in ollama container
if docker compose exec -T ollama nvidia-smi > /dev/null 2>&1; then
    echo -e "${GREEN}✓ GPU available${NC}"
    docker compose exec -T ollama nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader 2>/dev/null || true
else
    echo -e "${YELLOW}⚠ No GPU detected (running on CPU)${NC}"
    echo "Note: CPU mode is slower but functional"
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Test the embedding endpoint: curl http://localhost:7362/api/embeddings -d '{\"model\": \"$MODEL\", \"prompt\": \"test\"}'"
echo "  2. Check Ollama logs: docker compose logs ollama"
echo "  3. Access n8n at http://localhost:7361"
echo ""
