# Use official Node.js LTS image as base
FROM node:23.10.0

# Install system dependencies required for Puppeteer
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    libxrandr2 \
    libxss1 \
    libgtk-3-0 \
    ca-certificates \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy all source code
COPY . .

# Command to start the application
CMD ["npm", "start"]