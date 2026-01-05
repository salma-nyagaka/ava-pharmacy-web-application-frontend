# Ava Pharmacy Frontend

React web application for Ava Pharmacy.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header/
│   ├── Footer/
│   └── Layout/
├── pages/              # Page components (routes)
│   └── HomePage/
├── styles/             # Global styles and CSS variables
├── App.tsx             # Main app with routing
└── main.tsx            # Entry point
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit http://localhost:3000

## Build Commands

```bash
# Development build
npm run build

# Staging build
npm run build:staging

# Production build
npm run build:production
```

---

## Deployment

Deployment is automated via GitHub Actions:

| Branch | Environment | URL |
|--------|-------------|-----|
| `develop` | Staging | staging.avapharmacy.com |
| `main` | Production | avapharmacy.com |

### How It Works

1. Push to `develop` branch → Deploys to **staging.avapharmacy.com**
2. Push to `main` branch → Deploys to **avapharmacy.com**

---

## Setup Instructions

### 1. DNS Setup on hosting.com

Create the following DNS records:

| Type | Name | Value |
|------|------|-------|
| A | staging | Your staging server IP |
| A | @ | Your production server IP |
| A | www | Your production server IP |

### 2. Server Setup (Ubuntu/Debian)

Run these commands on both staging and production servers:

```bash
# Install Nginx
sudo apt update
sudo apt install nginx -y

# Create web directory
sudo mkdir -p /var/www/staging.avapharmacy.com  # for staging server
sudo mkdir -p /var/www/avapharmacy.com          # for production server

# Set permissions
sudo chown -R $USER:$USER /var/www/staging.avapharmacy.com
sudo chown -R $USER:$USER /var/www/avapharmacy.com
```

### 3. Nginx Configuration

**Staging server** - Create `/etc/nginx/sites-available/staging.avapharmacy.com`:

```nginx
server {
    listen 80;
    server_name staging.avapharmacy.com;
    root /var/www/staging.avapharmacy.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Production server** - Create `/etc/nginx/sites-available/avapharmacy.com`:

```nginx
server {
    listen 80;
    server_name avapharmacy.com www.avapharmacy.com;
    root /var/www/avapharmacy.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the sites:

```bash
# On staging server
sudo ln -s /etc/nginx/sites-available/staging.avapharmacy.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# On production server
sudo ln -s /etc/nginx/sites-available/avapharmacy.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Setup (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y

# Staging
sudo certbot --nginx -d staging.avapharmacy.com

# Production
sudo certbot --nginx -d avapharmacy.com -d www.avapharmacy.com
```

### 5. GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

**For Staging:**
| Secret Name | Value |
|-------------|-------|
| `STAGING_HOST` | Your staging server IP address |
| `STAGING_USERNAME` | SSH username (e.g., `ubuntu`) |
| `STAGING_SSH_KEY` | Private SSH key for staging server |

**For Production:**
| Secret Name | Value |
|-------------|-------|
| `PRODUCTION_HOST` | Your production server IP address |
| `PRODUCTION_USERNAME` | SSH username (e.g., `ubuntu`) |
| `PRODUCTION_SSH_KEY` | Private SSH key for production server |

### 6. Generate SSH Keys (if needed)

```bash
# Generate a new key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-server-ip

# Copy private key content for GitHub secret
cat ~/.ssh/github_deploy
```

---

## Git Workflow

```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Feature development
git checkout develop
git checkout -b feature/my-feature
# ... make changes ...
git add .
git commit -m "Add my feature"
git push origin feature/my-feature

# Merge to develop (deploys to staging)
git checkout develop
git merge feature/my-feature
git push origin develop

# Deploy to production
git checkout main
git merge develop
git push origin main
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | https://api.avapharmacy.com |
| VITE_APP_ENV | Environment name | production |
