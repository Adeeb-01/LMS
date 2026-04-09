# Quickstart: Configure Database Infrastructure

**Feature**: 011-configure-databases  
**Date**: 2026-03-11

## Prerequisites

- Node.js 18+ installed
- MongoDB 4.4+ running (local or remote)
- ChromaDB (optional, for semantic features)

## Environment Variables

Add the following to your `.env` file:

```env
# MongoDB (Required)
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/lms

# ChromaDB (Optional - semantic features disabled if not set)
CHROMA_HOST=http://localhost:8000
CHROMA_COLLECTION=lms_embeddings

# Database Options (Optional - defaults shown)
DB_MAX_POOL_SIZE=10
DB_SERVER_SELECTION_TIMEOUT_MS=5000
DB_SOCKET_TIMEOUT_MS=45000
DB_HEALTH_INTERVAL_MS=30000
```

## Quick Setup

### 1. MongoDB (Required)

**Local Development with Docker:**

```bash
# Start MongoDB
docker run -d --name lms-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=lms \
  mongo:7

# Verify connection
mongosh mongodb://localhost:27017/lms --eval "db.runCommand({ping:1})"
```

**Using MongoDB Atlas:**

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string from "Connect" > "Drivers"
3. Add to `.env`:
   ```env
   MONGODB_CONNECTION_STRING=mongodb+srv://user:pass@cluster.mongodb.net/lms
   ```

### 2. ChromaDB (Optional)

**Local Development with Docker:**

```bash
# Start ChromaDB
docker run -d --name lms-chroma \
  -p 8000:8000 \
  chromadb/chroma:latest

# Verify connection
curl http://localhost:8000/api/v1/heartbeat
```

**Skip ChromaDB:**

If you don't need semantic search features, simply don't set `CHROMA_HOST`. The application will start with a warning and disable semantic features.

### 3. Start the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Verify Configuration

Check the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response (with both databases):
```json
{
  "status": "healthy",
  "services": {
    "mongodb": { "status": "healthy" },
    "chroma": { "status": "healthy" }
  }
}
```

Expected response (MongoDB only):
```json
{
  "status": "degraded",
  "services": {
    "mongodb": { "status": "healthy" },
    "chroma": { "status": "unavailable", "message": "ChromaDB not configured" }
  }
}
```

## Docker Compose (Full Stack)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_CONNECTION_STRING=mongodb://mongodb:27017/lms
      - CHROMA_HOST=http://chroma:8000
    depends_on:
      - mongodb
      - chroma
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  mongodb_data:
  chroma_data:
```

Start all services:

```bash
docker-compose up -d
```

## Troubleshooting

### MongoDB Connection Failed

```
Error: MongoNetworkError: connection refused
```

**Solutions:**
1. Check MongoDB is running: `docker ps | grep mongo`
2. Verify connection string format
3. Check firewall/network settings
4. Ensure MongoDB allows connections from your IP (Atlas)

### ChromaDB Connection Timeout

```
Error: ETIMEDOUT connecting to ChromaDB
```

**Solutions:**
1. Check ChromaDB is running: `curl http://localhost:8000/api/v1/heartbeat`
2. Verify `CHROMA_HOST` is correct
3. Check network connectivity
4. Application will continue with semantic features disabled

### Configuration Validation Error

```
Error: CONFIG_VALIDATION_ERROR - Invalid database configuration
```

**Solutions:**
1. Check all required environment variables are set
2. Verify connection string format
3. Ensure numeric values are within valid ranges

## Testing the Setup

Run database-related tests:

```bash
# All database tests
npm test -- --grep "database"

# Specific test files
npm test -- tests/unit/db-config.test.js
npm test -- tests/integration/mongo-health.test.js
```

## Security Notes

1. **Never commit `.env`** - it's in `.gitignore`
2. **Use strong passwords** for production MongoDB
3. **Enable TLS** for production connections
4. **Restrict network access** to databases in production
5. **Rotate credentials** periodically

## Next Steps

After configuration is complete:

1. Seed initial data: `npm run db:reset`
2. Create admin account: Visit `/setup/admin`
3. Configure additional features as needed
