#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl git nginx ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

npm install -g pm2

mkdir -p /opt/mbti/backend
mkdir -p /opt/mbti/backups
mkdir -p /etc/nginx/ssl/mbti.pinggu.com

systemctl enable nginx
systemctl start nginx

echo "Bootstrap completed. Next: upload backend/, create /opt/mbti/backend/.env, then start PM2."
