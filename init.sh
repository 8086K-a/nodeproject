#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="ICVN-Project-master"
DEV_URL="http://127.0.0.1:3000"
DEV_LOG="/tmp/icvn-dev.log"

is_dev_port_listening() {
  lsof -iTCP:3000 -sTCP:LISTEN -n -P >/dev/null 2>&1
}

echo -e "${YELLOW}Initializing project in ${PROJECT_DIR}...${NC}"

echo "Installing dependencies..."
cd "$PROJECT_DIR" && npm install && cd ..

if curl -fsS "$DEV_URL" >/dev/null 2>&1; then
  echo "Development server already responding at ${DEV_URL}"
  echo -e "${GREEN}✓ Initialization complete!${NC}"
  echo ""
  echo "Ready to continue development."
  exit 0
fi

if is_dev_port_listening; then
  echo "Detected an existing listener on ${DEV_URL}."
  echo "If the page does not load in this environment, reuse the existing interactive dev session or free port 3000 before rerunning."
  echo -e "${GREEN}✓ Initialization complete!${NC}"
  echo ""
  echo "Ready to continue development."
  exit 0
fi

echo "Starting development server..."
cd "$PROJECT_DIR"
nohup npm run dev -- --hostname 127.0.0.1 >"$DEV_LOG" 2>&1 &
SERVER_PID=$!
cd ..

echo "Waiting for server to start..."
READY=0
for _ in $(seq 1 30); do
  if curl -fsS "$DEV_URL" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ] && is_dev_port_listening; then
  echo "Development server opened port 3000, but the health check did not return in time."
  echo -e "${GREEN}✓ Initialization complete!${NC}"
  echo -e "${GREEN}✓ Dev server expected at ${DEV_URL} (PID: $SERVER_PID)${NC}"
  echo -e "${GREEN}✓ Dev log: ${DEV_LOG}${NC}"
  echo ""
  echo "Ready to continue development."
  exit 0
fi

if [ "$READY" -ne 1 ]; then
  echo "Failed to start development server. Recent log output:"
  tail -n 40 "$DEV_LOG" || true
  exit 1
fi

echo -e "${GREEN}✓ Initialization complete!${NC}"
echo -e "${GREEN}✓ Dev server running at ${DEV_URL} (PID: $SERVER_PID)${NC}"
echo -e "${GREEN}✓ Dev log: ${DEV_LOG}${NC}"
echo ""
echo "Ready to continue development."
