# ChainMind Deployment Guide (VPS)

This guide assumes you have a Linux VPS (Ubuntu/Debian) with Node.js installed and Nginx running.

## 1. Preparation (Local Machine)

Before pushing to the server, ensure the UI is built.

```bash
# Build the UI assets (React) to src/web/public
npm run build:ui
```

*Note: You can also run this on the server if the server restricts resource usage, but building locally is safer.*

### Troubleshooting Common Issues

### Troubleshooting Common Issues

**ERR_TOO_MANY_REDIRECTS**:
1.  **Browser Cache**:
    Your browser might have cached old redirects. **Try opening the site in Incognito Mode.** If it works there, clear your main browser's cache.

2.  **Cloudflare Users**:
    If you use **Cloudflare** (even if you didn't set it up explicitly, some registrars use it by default):
    -   Go to your Cloudflare Dashboard > SSL/TLS.
    -   Change the encryption mode from **Flexible** to **Full** (or Full Strict).
    -   *Why?* "Flexible" talks to your server on HTTP (port 80). Nginx redirects that to HTTPS. Cloudflare sees the redirect and loops. "Full" talks to your server on HTTPS (port 443), breaking the loop.

3.  **Other Proxies**:
    If you use another proxy or load balancer, ensure it passes traffic to port 443 (HTTPS) on your server, not port 80.

### Troubleshooting Server Builds
If you see errors like `Cannot find native binding` or `rolldown` errors when building on the VPS, you need to reinstall the UI dependencies specifically for the Linux environment:

```bash
cd src/web/ui
rm -rf node_modules package-lock.json
npm install
cd ../../..
npm run build:ui
```

## 2. Connect to Server

You must connect to your VPS via SSH. Use the `root` username (or the one provided by your VPS host).

```bash
# Replace 'root' with your VPS username if different
ssh root@5.189.145.246
```

## 3. Server Setup

### A. Prerequisites
Ensure you have **Node.js** (v18+) and **PM2** installed.

```bash
# Install PM2 globally
npm install -g pm2
```

### B. Install Dependencies
Navigate to your project folder on the VPS.

```bash
cd /path/to/ChainMind
npm install --legacy-peer-deps
```

## 3. Configuration (.env)

Ensure your `.env` file is present on the server with the correct production settings.

```ini
WEB_PORT=3333
WEB_HOST=localhost
ZAI_API_KEY=your_key_here
MOLTBOOK_API_KEY=your_key_here
# ... other keys
```

## 4. Startup with PM2

Run the server using PM2 to keep it alive 24/7.

```bash
# Start the application
pm2 start "npm run web" --name "chainmind"

# Save the PM2 list so it restarts on reboot
pm2 save
pm2 startup
```

## 5. Nginx Configuration (Reverse Proxy)

Since you already have SSL set up for `chainmind.dev`, you need to configure Nginx to proxy requests to your localhost app running on port 3000.

### Step-by-Step Nginx Setup

1.  **Find your config file**:
    Usually located at `/etc/nginx/sites-available/chainmind.dev` or `/etc/nginx/conf.d/chainmind.dev.conf`.

2.  **Edit the file**:
    ```bash
    sudo nano /etc/nginx/sites-available/chainmind.dev
    ```

3.  **Update the `location /` block**:
    Find the existing `location / { ... }` block inside your `server` block (the one observing port 443/SSL) and replace it with:

    ```nginx
    location / {
        # Proxy to your local Node.js app on port 3333
        proxy_pass http://localhost:3333;
        
        # Standard proxy headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Forward real IP address
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    ```

    **Pre-SSL Configuration (HTTP Only)**

    Use this configuration *before* running Certbot.

    ```nginx
    server {
        listen 80;
        server_name chainmind.dev www.chainmind.dev;

        location / {
            proxy_pass http://localhost:3333;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
    ```

4.  **Enable the Site** (Crucial Step):
    You must link your config to the `sites-enabled` folder for Nginx to see it.
    ```bash
    # Link your config
    sudo ln -s /etc/nginx/sites-available/chainmind.dev /etc/nginx/sites-enabled/
    
    # Remove the default Nginx page (optional but recommended)
    sudo rm /etc/nginx/sites-enabled/default
    ```

5.  **Test Configuration**:
    Run this command to check for syntax errors:
    ```bash
    sudo nginx -t
    ```
    *You should see "syntax is ok" and "test is successful".*

6.  **Restart Nginx**:
    Apply the changes:
    ```bash
    sudo systemctl restart nginx
    ```

## 6. SSL Setup (Certbot)

Now that Nginx is running on port 80, use Certbot to get free SSL certificates.

1.  **Install Certbot** (if not installed):
    ```bash
    sudo apt install certbot python3-certbot-nginx
    ```

2.  **Run Certbot**:
    ```bash
    sudo certbot --nginx -d chainmind.dev -d www.chainmind.dev
    ```

3.  **Follow the Prompts**:
    - Enter your email.
    - Agree to terms.
    - Choose option **2** (Redirect) if asked, to force HTTPS.

Certbot will automatically update your Nginx config file to look like the "Full Example" from before.

## 7. Verification

1.  Visit `https://chainmind.dev`.
2.  Check logs if something is wrong: `pm2 logs chainmind`.

## 7. Updating

To update the application later:

```bash
git pull
npm install --legacy-peer-deps
npm run build:ui  # If UI changes were made
pm2 restart chainmind
```
