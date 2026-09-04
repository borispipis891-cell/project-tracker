#!/bin/bash
# Setup script for VPS deployment

set -e

echo "🚀 Starting server setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "🐘 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PostgreSQL
echo "🐘 Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE projecttracker;"
sudo -u postgres psql -c "CREATE USER projectuser WITH PASSWORD 'P@ssw0rd2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE projecttracker TO projectuser;"
sudo -u postgres psql -d projecttracker -c "GRANT ALL ON SCHEMA public TO projectuser;"

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/project-tracker
cd /var/www/project-tracker

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "✅ Server setup complete!"
echo ""
echo "📝 Database credentials:"
echo "Database: projecttracker"
echo "User: projectuser"
echo "Password: P@ssw0rd2024!"
echo "Connection string: postgresql://projectuser:P@ssw0rd2024!@localhost:5432/projecttracker"
