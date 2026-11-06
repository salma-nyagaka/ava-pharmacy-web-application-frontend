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

## CAPTCHA configuration

Before building, set repository or staging environment Actions variables:

- `VITE_CAPTCHA_PROVIDER`: `turnstile` (default) or `hcaptcha`.
- `VITE_TURNSTILE_SITE_KEY` or `VITE_HCAPTCHA_SITE_KEY`: the selected provider's public site key.

Register `app-staging.avapharmacy.co.ke` with that provider. Configure the backend
with the same `BOT_CHALLENGE_PROVIDER` and matching `TURNSTILE_SECRET_KEY` or
`HCAPTCHA_SECRET_KEY`. Secret keys belong only on the backend. Production uses
the same Actions variables with its own registered hostname and matching keys.

Vite embeds public keys at build time; changing them requires rebuilding and
redeploying. Staging and production builds fail if the selected public key is
missing. For a local staging build, provide these variables in `.env.staging.local`
or the shell. Do not use provider test keys for deployed environments.

After deployment, verify that the login widget appears, verification enables
sign-in, and an expired or rejected token requires a fresh check.
