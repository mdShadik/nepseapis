# Use the official Playwright image with necessary dependencies
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Set environment variables
ENV PORT=3000
ENV SHARE_SANSAR_URL=https://www.sharesansar.com/live-trading
ENV BROKER_URL=https://chukul.com/brokers-analytics

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your application will run on
EXPOSE $PORT

# Command to start the application
CMD ["npm", "start"]
