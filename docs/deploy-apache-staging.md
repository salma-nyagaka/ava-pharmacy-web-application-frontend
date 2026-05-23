# AvaPharmacy Frontend Staging Deployment

This deploys the Vite frontend to Apache on:

```text
https://app-staging.avapharmacy.co.ke
```

The staging frontend calls the staging backend API at:

```text
https://api-staging.avapharmacy.co.ke
```

## One-Time Droplet Setup

Run these commands on the droplet:

```bash
mkdir -p /home/ava/staging
git clone git@github.com:salma-nyagaka/ava-pharmacy-web-application-frontend.git /home/ava/staging/frontend

sudo mkdir -p /var/www/avapharmacy-frontend-staging
sudo chown -R ava:www-data /var/www/avapharmacy-frontend-staging
sudo chmod -R 775 /var/www/avapharmacy-frontend-staging
```

Copy and enable the Apache site:

```bash
sudo cp /home/ava/staging/frontend/deploy/apache/avapharmacy-frontend-staging.conf /etc/apache2/sites-available/
sudo a2ensite avapharmacy-frontend-staging.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Allow GitHub Actions to validate and reload Apache:

```bash
sudo visudo -f /etc/sudoers.d/avapharmacy-deploy
```

Ensure these lines exist:

```text
ava ALL=(root) NOPASSWD: /usr/sbin/apache2ctl configtest
ava ALL=(root) NOPASSWD: /bin/systemctl reload apache2
```

## GitHub Environment Secrets

In the frontend GitHub repo, create/use the `staging` environment and add:

```text
DROPLET_HOST      162.243.18.176
DROPLET_USER      ava
DROPLET_SSH_KEY   private SSH key used by GitHub Actions
```

## Deploy

Push to `develop`:

```bash
git checkout develop
git push origin develop
```

The workflow builds with:

```bash
npm run build:staging
```

and uploads `dist/` to:

```text
/var/www/avapharmacy-frontend-staging
```
