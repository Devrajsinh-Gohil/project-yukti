#!/bin/bash
# deploy/oracle_setup.sh

# Exit on error
set -e

echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

echo ">>> Installing Docker..."
# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository (ARM64 for Oracle Free Tier)
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Allow docker to run without sudo
sudo usermod -aG docker $USER

echo ">>> Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

echo ">>> Firewall Setup..."
# Oracle specific: Open ports in iptables (Oracle Ubuntu images come with strict iptables)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save

echo ">>> Done! Please logout and login again for Docker group changes to take effect."
