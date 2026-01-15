#!/bin/bash

# Hytale Server Manager - Bootstrap Installer
# This script sets up the environment and runs the setup wizard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   Hytale Server Manager - Installer      ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}This installation will automatically:${NC}"
echo -e "  ${GREEN}✓${NC} Check and install Node.js v20"
echo -e "  ${GREEN}✓${NC} Install npm dependencies"
echo -e "  ${GREEN}✓${NC} Check and install Java 25"
echo -e "  ${GREEN}✓${NC} Check and install unzip utility"
echo -e "  ${GREEN}✓${NC} Launch interactive setup wizard"
echo ""
echo -e "${YELLOW}You will be prompted for:${NC}"
echo -e "  • Hytale account login (to download server files)"
echo -e "  • Server configuration (name, port, max players, etc.)"
echo -e "  • Optional: Discord bot configuration"
echo -e "  • Optional: Automatic backup settings"
echo ""
echo -e "${BLUE}Estimated time: 10-15 minutes${NC}"
echo ""
read -p "Press Enter to begin installation or Ctrl+C to cancel... "
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${YELLOW}Warning: This script is designed for Linux. You may encounter issues on other systems.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    echo "Installing Node.js..."

    # Install Node.js using NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js is installed: $NODE_VERSION${NC}"

    # Check if version is at least v18
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}Node.js version 18 or higher is recommended. Current: $NODE_VERSION${NC}"
        read -p "Continue with current version? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Check if npm is installed
echo -e "${BLUE}Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed.${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}npm is installed: $NPM_VERSION${NC}"
fi

# Check system requirements
echo -e "${BLUE}Checking system requirements...${NC}"

# Check available memory
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
echo "Available RAM: ${TOTAL_MEM}MB"
if [ "$TOTAL_MEM" -lt 2048 ]; then
    echo -e "${YELLOW}Warning: At least 2GB of RAM is recommended for Hytale server${NC}"
fi

# Check available disk space
AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
echo "Available disk space: ${AVAILABLE_SPACE}GB"
if [ "$AVAILABLE_SPACE" -lt 10 ]; then
    echo -e "${YELLOW}Warning: At least 10GB of free disk space is recommended${NC}"
fi

# Create necessary directories
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p src
mkdir -p logs
mkdir -p server-data

# Install npm dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Check if Java is installed (required for Hytale server)
echo -e "${BLUE}Checking Java installation...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${YELLOW}Java is not installed. Installing OpenJDK 25...${NC}"
    sudo apt-get update
    sudo apt-get install -y openjdk-25-jdk
    echo -e "${GREEN}Java 25 installed successfully${NC}"
else
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    JAVA_MAJOR=$(echo $JAVA_VERSION | cut -d'.' -f1)
    echo -e "${GREEN}Java is installed: $JAVA_VERSION${NC}"

    if [ "$JAVA_MAJOR" -lt 25 ]; then
        echo -e "${YELLOW}Java ${JAVA_VERSION} found. Upgrading to Java 25...${NC}"
        sudo apt-get update
        sudo apt-get install -y openjdk-25-jdk
        echo -e "${GREEN}Java 25 installed successfully${NC}"
    fi
fi

# Check if unzip is installed (required for extracting server files)
echo -e "${BLUE}Checking unzip installation...${NC}"
if ! command -v unzip &> /dev/null; then
    echo -e "${YELLOW}unzip is not installed. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y unzip
    echo -e "${GREEN}unzip installed successfully${NC}"
else
    echo -e "${GREEN}unzip is installed${NC}"
fi

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════╗"
echo "║   Installation Complete!                  ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Starting setup wizard...${NC}"
echo ""

# Automatically run the setup wizard
npm run setup
