#!/bin/bash
# Deploy application script

set -e

APP_DIR="/var/www/project-tracker"
REPO_URL="https://github.com/borispipis891-cell/project-tracker.git"

echo "🚀 Deploying application..."

# Clone or pull repository
if [ -d "$APP_DIR/.git" ]; then
  echo "📥 Pulling latest changes..."
  cd $APP_DIR
  git pull origin main
else
  echo "📥 Cloning repository..."
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
fi

# Create .env file
echo "📝 Creating .env file..."
cat > .env << 'EOF'
DATABASE_URL="postgresql://projectuser:P@ssw0rd2024!@localhost:5432/projecttracker"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-$(openssl rand -base64 32)"
NEXTAUTH_URL="http://159.194.243.41:3000"

# SMTP Settings (configure with your email)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Cloudinary (optional - for file uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# App
APP_URL="http://159.194.243.41:3000"
NODE_ENV="production"
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# Build application
echo "🏗️ Building application..."
npm run build

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 delete project-tracker 2>/dev/null || true
pm2 start npm --name "project-tracker" -- start
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo ""
echo "🌐 Application is running at: http://159.194.243.41:3000"
echo ""
echo "📝 Useful PM2 commands:"
echo "  pm2 logs project-tracker    # View logs"
echo "  pm2 restart project-tracker # Restart app"
echo "  pm2 stop project-tracker    # Stop app"
echo "  pm2 status                  # Check status"
