#!/bin/bash
# Elizaicoin HiveOS Setup Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Elizaicoin HiveOS Setup${NC}"
echo "This script will help you set up Elizaicoin mining on HiveOS."
echo

# Get user inputs
echo -e "${YELLOW}Please provide the following information:${NC}"
echo -n "Enter your mining pool URL [pool.elizaicoin.example.com:3333]: "
read POOL_URL
POOL_URL=${POOL_URL:-"pool.elizaicoin.example.com:3333"}

echo -n "Enter your Elizaicoin wallet address: "
read WALLET_ADDRESS
while [ -z "$WALLET_ADDRESS" ]; do
    echo -e "${RED}Wallet address cannot be empty.${NC}"
    echo -n "Enter your Elizaicoin wallet address: "
    read WALLET_ADDRESS
done

echo -n "Enter your worker name [worker1]: "
read WORKER_NAME
WORKER_NAME=${WORKER_NAME:-"worker1"}

echo -n "Select miner type (1=CPU, 2=AMD GPU, 3=NVIDIA GPU) [1]: "
read MINER_TYPE
MINER_TYPE=${MINER_TYPE:-"1"}

case $MINER_TYPE in
    1)
        MINER="cpuminer-opt"
        echo -e "${YELLOW}Selected CPU mining with cpuminer-opt${NC}"
        ;;
    2)
        MINER="teamredminer"
        echo -e "${YELLOW}Selected AMD GPU mining with teamredminer${NC}"
        ;;
    3)
        MINER="srbminer-multi"
        echo -e "${YELLOW}Selected NVIDIA GPU mining with srbminer-multi${NC}"
        ;;
    *)
        echo -e "${RED}Invalid selection. Defaulting to CPU mining.${NC}"
        MINER="cpuminer-opt"
        ;;
esac

# Create a temporary file with the updated configuration
TMP_FILE=$(mktemp)
cat elizaicoin.conf > $TMP_FILE

# Update the configuration
sed -i "s/POOL=ezc.example.com:3333/POOL=$POOL_URL/" $TMP_FILE

# Create a flight sheet configuration
FLIGHT_SHEET="elizaicoin-$WORKER_NAME.sh"
cat > $FLIGHT_SHEET << EOL
#!/bin/bash
# Elizaicoin Flight Sheet for HiveOS
# Generated on $(date)

# Configuration
WALLET="$WALLET_ADDRESS"
WORKER="$WORKER_NAME"
POOL="$POOL_URL"
MINER="$MINER"

# Create custom miner if it doesn't exist
if ! grep -q "CUSTOM_NAME=Elizaicoin" /hive/miners/custom/$MINER/h-manifest.conf 2>/dev/null; then
    echo "Creating custom miner configuration..."
    mkdir -p /hive/miners/custom/$MINER
    cp $TMP_FILE /hive/miners/custom/$MINER/h-manifest.conf
fi

# Create flight sheet
cat > /tmp/fs_elizaicoin.json << EOF
{
  "name": "Elizaicoin-$WORKER",
  "is_default": false,
  "rigs": [],
  "coin": "Elizaicoin",
  "pool": {
    "name": "Custom",
    "url": "$POOL",
    "pass": "x"
  },
  "miner": {
    "name": "$MINER",
    "algo": "scrypt"
  },
  "wallet": {
    "address": "$WALLET",
    "rig_id": "$WORKER"
  }
}
EOF

echo "Flight sheet created: /tmp/fs_elizaicoin.json"
echo "To apply this flight sheet, go to your HiveOS dashboard and import it."
EOL

chmod +x $FLIGHT_SHEET

# Create a README file with instructions
README_FILE="README_HIVEOS.md"
cat > $README_FILE << EOL
# Elizaicoin Mining on HiveOS

This guide will help you set up Elizaicoin mining on HiveOS.

## Prerequisites

- A HiveOS account and at least one worker set up
- An Elizaicoin wallet address

## Setup Instructions

1. Upload the following files to your HiveOS worker:
   - \`elizaicoin.conf\` - The miner configuration file
   - \`$FLIGHT_SHEET\` - The flight sheet setup script

2. SSH into your HiveOS worker and run:
   \`\`\`
   chmod +x $FLIGHT_SHEET
   ./$FLIGHT_SHEET
   \`\`\`

3. Go to your HiveOS dashboard and import the flight sheet from \`/tmp/fs_elizaicoin.json\`

4. Apply the flight sheet to your worker(s)

## Manual Setup

If you prefer to set up manually:

1. In your HiveOS dashboard, go to "Miners" and create a custom miner:
   - Name: Elizaicoin
   - Installation URL: (leave blank)
   - Hash algorithm: scrypt

2. Create a new flight sheet:
   - Coin: Elizaicoin
   - Wallet: Your Elizaicoin wallet address
   - Pool: Custom
     - URL: $POOL_URL
     - Pass: x
   - Miner: $MINER
     - Setup Miner Config:
       - Copy the contents of elizaicoin.conf

3. Apply the flight sheet to your worker(s)

## Troubleshooting

- Check the miner logs in the HiveOS dashboard
- Ensure your wallet address is correct
- Verify that the pool is online and accessible

For more help, visit the Elizaicoin community forum or Discord server.
EOL

echo -e "${GREEN}Setup complete!${NC}"
echo "The following files have been created:"
echo "  - $FLIGHT_SHEET - HiveOS flight sheet setup script"
echo "  - $README_FILE - Instructions for setting up mining on HiveOS"
echo
echo "To use these files, upload them to your HiveOS worker and follow the instructions in the README file."
echo
echo "Happy mining!"

# Clean up
rm $TMP_FILE
