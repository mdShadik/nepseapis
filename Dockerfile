# Use an official Node.js runtime as a parent image
FROM mcr.microsoft.com/playwright:v1.34.0-focal

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Install Playwright browsers (make sure you add the specific ones you need, or just use the full set)
RUN npx playwright install --with-deps

# Expose the port (if running a web server, adjust accordingly)
EXPOSE 3000

# Command to run your app or Playwright tests
CMD [ "npm", "start" ]  # Example command for running Playwright tests
