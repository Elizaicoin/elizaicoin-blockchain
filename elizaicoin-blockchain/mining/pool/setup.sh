#!/bin/bash
# Elizaicoin Mining Pool Setup Script

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Elizaicoin Mining Pool Setup${NC}"
echo "This script will set up an Elizaicoin mining pool."
echo

# Check for required dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed. Please install Node.js 16 or higher.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required but not installed. Please install npm.${NC}" >&2; exit 1; }
command -v redis-server >/dev/null 2>&1 || { echo -e "${RED}Redis is required but not installed. Please install Redis.${NC}" >&2; exit 1; }

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Node.js 16 or higher is required. You have Node.js $NODE_VERSION.${NC}"
    exit 1
fi

# Check if Redis is running
redis-cli ping > /dev/null 2>&1 || { 
    echo -e "${YELLOW}Redis is not running. Attempting to start Redis...${NC}"
    redis-server --daemonize yes
    sleep 2
    redis-cli ping > /dev/null 2>&1 || { 
        echo -e "${RED}Failed to start Redis. Please start Redis manually.${NC}" >&2
        exit 1
    }
    echo -e "${GREEN}Redis started successfully.${NC}"
}

# Create directories if they don't exist
mkdir -p logs
mkdir -p data

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Configure the pool
echo -e "${YELLOW}Configuring the pool...${NC}"
echo -n "Enter your pool name [Elizaicoin Mining Pool]: "
read POOL_NAME
POOL_NAME=${POOL_NAME:-"Elizaicoin Mining Pool"}

echo -n "Enter your pool fee percentage [1.0]: "
read POOL_FEE
POOL_FEE=${POOL_FEE:-"1.0"}

echo -n "Enter your pool stratum host [0.0.0.0]: "
read STRATUM_HOST
STRATUM_HOST=${STRATUM_HOST:-"0.0.0.0"}

echo -n "Enter your pool stratum port [3333]: "
read STRATUM_PORT
STRATUM_PORT=${STRATUM_PORT:-"3333"}

echo -n "Enter your blockchain API URL [http://localhost:5000]: "
read API_URL
API_URL=${API_URL:-"http://localhost:5000"}

echo -n "Enter your website port [8080]: "
read WEBSITE_PORT
WEBSITE_PORT=${WEBSITE_PORT:-"8080"}

echo -n "Enter your admin email [admin@example.com]: "
read ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@example.com"}

# Update config.json with user inputs
echo -e "${YELLOW}Updating configuration...${NC}"
sed -i.bak "s/\"name\": \"Elizaicoin Mining Pool\"/\"name\": \"$POOL_NAME\"/" config.json
sed -i.bak "s/\"feePercent\": 1.0/\"feePercent\": $POOL_FEE/" config.json
sed -i.bak "s/\"stratumHost\": \"0.0.0.0\"/\"stratumHost\": \"$STRATUM_HOST\"/" config.json
sed -i.bak "s/\"stratumPort\": 3333/\"stratumPort\": $STRATUM_PORT/" config.json
sed -i.bak "s|\"apiUrl\": \"http://localhost:5000\"|\"apiUrl\": \"$API_URL\"|" config.json
sed -i.bak "s/\"port\": 8080/\"port\": $WEBSITE_PORT/" config.json
sed -i.bak "s/\"adminEmail\": \"admin@elizaicoin.example.com\"/\"adminEmail\": \"$ADMIN_EMAIL\"/" config.json

# Remove backup file
rm config.json.bak

# Create a systemd service file
echo -e "${YELLOW}Creating systemd service file...${NC}"
SERVICE_FILE="elizaicoin-pool.service"
cat > $SERVICE_FILE << EOL
[Unit]
Description=Elizaicoin Mining Pool
After=network.target redis-server.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(which node) index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=elizaicoin-pool

[Install]
WantedBy=multi-user.target
EOL

echo -e "${GREEN}Systemd service file created: $SERVICE_FILE${NC}"
echo "To install the service, run:"
echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable elizaicoin-pool"
echo "  sudo systemctl start elizaicoin-pool"

# Create a start script
echo -e "${YELLOW}Creating start script...${NC}"
START_SCRIPT="start-pool.sh"
cat > $START_SCRIPT << EOL
#!/bin/bash
# Start Elizaicoin Mining Pool
cd $(pwd)
node index.js
EOL

chmod +x $START_SCRIPT
echo -e "${GREEN}Start script created: $START_SCRIPT${NC}"

# Final instructions
echo
echo -e "${GREEN}Elizaicoin Mining Pool setup complete!${NC}"
echo
echo "To start the pool manually, run:"
echo "  ./start-pool.sh"
echo
echo "The pool website will be available at:"
echo "  http://localhost:$WEBSITE_PORT"
echo
echo "Miners can connect to your pool using:"
echo "  stratum+tcp://<your-server-ip>:$STRATUM_PORT"
echo
echo "Happy mining!"
