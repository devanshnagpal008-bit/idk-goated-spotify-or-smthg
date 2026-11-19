#!/bin/bash
# ============================================================
# Sonora Backend — Oracle Cloud Free Tier Setup Script
# Run this on a fresh Oracle Cloud ARM VM (Ubuntu 22.04+)
# Usage: chmod +x setup-oracle.sh && sudo ./setup-oracle.sh
# ============================================================

set -euo pipefail

echo "========================================="
echo " Sonora Backend — Oracle Cloud Setup"
echo "========================================="

# 1. System updates
echo "[1/7] Updating system packages..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu
    echo "  → Docker installed."
else
    echo "  → Docker already installed."
fi

# 3. Install Docker Compose plugin
echo "[3/7] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    echo "  → Docker Compose installed."
else
    echo "  → Docker Compose already installed."
fi

# 4. Clone the repository
echo "[4/7] Cloning Sonora repository..."
REPO_DIR="/opt/sonora"
if [ -d "$REPO_DIR" ]; then
    echo "  → Repo exists, pulling latest..."
    cd "$REPO_DIR" && git pull origin main
else
    git clone https://github.com/devanshnagpal008-bit/idk-goated-spotify-or-smthg.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

# 5. Build and run with Docker Compose
echo "[5/7] Building and starting Sonora backend..."
cd "$REPO_DIR"
docker compose -f deploy/docker-compose.yml up -d --build

# 6. Open firewall port 8000
echo "[6/7] Opening firewall port 8000..."
if command -v iptables &> /dev/null; then
    iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
    netfilter-persistent save 2>/dev/null || true
fi

# 7. Verify
echo "[7/7] Verifying deployment..."
sleep 5
if curl -sf http://localhost:8000/health > /dev/null; then
    echo ""
    echo "========================================="
    echo " ✅ Sonora backend is LIVE!"
    echo " Health: http://localhost:8000/health"
    echo ""
    echo " Your public URL will be:"
    echo " http://<YOUR_VM_PUBLIC_IP>:8000/api"
    echo ""
    echo " Set this in Cloudflare Pages env vars:"
    echo " EXPO_PUBLIC_API_URL=http://<YOUR_VM_PUBLIC_IP>:8000/api"
    echo "========================================="
else
    echo ""
    echo "⚠️  Backend not responding yet. Check logs:"
    echo "  docker compose -f /opt/sonora/deploy/docker-compose.yml logs -f"
fi
