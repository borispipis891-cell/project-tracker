#!/bin/bash
# Setup Nginx reverse proxy

echo "🌐 Configuring Nginx..."

cat > /etc/nginx/sites-available/project-tracker << 'EOF'
server {
    listen 80;
    server_name 159.194.243.41;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/project-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configured successfully!"
echo "🌐 Access your app at: http://159.194.243.41"
