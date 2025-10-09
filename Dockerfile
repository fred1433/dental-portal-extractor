FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node dependencies WITHOUT running postinstall
RUN npm ci --ignore-scripts

# Copy application files (including TypeScript source)
COPY . .

# Rebuild sqlite3 native bindings for Linux
RUN npm rebuild sqlite3

# Build the main project TypeScript
RUN npm run build

# Build the dot-extractor TypeScript submodule
RUN cd dot-extractor && npm install && npm run build

# Install Python dependencies (including Playwright for Python)
COPY requirements.txt ./
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# The browsers are already installed in the Playwright image
# No need to run playwright install

# Use PORT environment variable from Render
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]