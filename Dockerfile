# Use Node.js 18 alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY sif-backend/package*.json ./sif-backend/

# Install frontend dependencies
RUN npm install

# Install backend dependencies
RUN cd sif-backend && npm install

# Copy all source code
COPY . .

# Build the React application
RUN npm run build:frontend

# Expose port
EXPOSE 5000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start the backend server
CMD ["npm", "start"]
