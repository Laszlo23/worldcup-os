#!/usr/bin/env bash
# Install / renew Let's Encrypt cert and write nginx vhost for match.buildingcultureid.space
set -euo pipefail

DOMAIN="match.buildingcultureid.space"
OLD_CONF="/etc/nginx/sites-available/match-buildingcultureid.space"
CONF="/etc/nginx/sites-available/${DOMAIN}"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
WEBROOT="/var/www/certbot"
APP_PORT="${PORT:-3031}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@buildingcultureid.space}"

mkdir -p "$WEBROOT"

# Remove legacy vhost that conflicts on port 80
rm -f /etc/nginx/sites-enabled/match-buildingcultureid.space
rm -f "$OLD_CONF"

# HTTP vhost for ACME + app (before cert exists)
cat > "$CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

ln -sf "$CONF" "$ENABLED"
nginx -t
systemctl reload nginx

if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
  certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
fi

# HTTPS vhost
cat > "$CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

nginx -t
systemctl reload nginx
echo "SSL active for https://${DOMAIN}"
