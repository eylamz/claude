import mongoose from 'mongoose';

/**
 * Connection state types
 */
interface ConnectionState {
  isConnected: boolean;
  readyState: number;
  readyStateText: string;
  host?: string;
  name?: string;
  port?: number;
  user?: string;
}

/**
 * MongoDB connection state
 */
let isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Get environment-specific configuration
 */
const getEnvironment = (): 'development' | 'production' | 'test' => {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'test') return env;
  return 'development';
};

/**
 * Environment-based database selection
 */
const getDatabaseUri = (): string => {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. Please add it to .env.local'
    );
  }

  const env = getEnvironment();
  
  // Log which database is being used (without exposing credentials)
  const uriParts = uri.split('@');
  const credentials = uriParts[0]?.split('//')[1] || '';
  console.log(`📊 Environment: ${env}`);
  console.log(`📊 Database: ${credentials ? credentials.split(':')[0] : 'default'}`);

  return uri;
};

/**
 * Connection options with pooling
 */
const getConnectionOptions = (): mongoose.ConnectOptions => {
  const env = getEnvironment();
  
  // Base configuration
  const baseOptions: mongoose.ConnectOptions = {
    // Connection pooling configuration
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections to maintain
    serverSelectionTimeoutMS: 5000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout
    
    // Retry configuration
    retryWrites: true,
    retryReads: true,
    
    // Additional options
    connectTimeoutMS: 30000,
    
    // Disable mongoose buffering for serverless
    bufferCommands: false,
  };

  // Environment-specific overrides
  if (env === 'production') {
    return {
      ...baseOptions,
      maxPoolSize: 20, // More connections in production
      minPoolSize: 5,
    };
  }

  if (env === 'test') {
    return {
      ...baseOptions,
      maxPoolSize: 5,
      minPoolSize: 1,
      bufferCommands: true, // Allow buffering in tests
    };
  }

  return baseOptions;
};

/**
 * Sleep utility for retry logic
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Connect to MongoDB with retry logic
 */
async function connectWithRetry(
  uri: string,
  options: mongoose.ConnectOptions
): Promise<typeof mongoose> {
  try {
    const connection = await mongoose.connect(uri, options);
    
    console.log('✅ MongoDB connected successfully');
    isConnected = true;
    retryAttempts = 0;
    
    return connection;
  } catch (error) {
    retryAttempts++;
    
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      console.error(
        `❌ MongoDB connection failed (attempt ${retryAttempts}/${MAX_RETRY_ATTEMPTS}):`,
        error
      );
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      
      await sleep(RETRY_DELAY * retryAttempts); // Exponential backoff
      
      return connectWithRetry(uri, options);
    } else {
      console.error('❌ MongoDB connection failed after max retry attempts:', error);
      isConnected = false;
      throw error;
    }
  }
}

/**
 * Connect to the database
 * Uses connection caching for serverless environments
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection promise if available
  if (connectionPromise) {
    return connectionPromise;
  }

  // Return cached connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose;
  }

  try {
    const uri = getDatabaseUri();
    const options = getConnectionOptions();

    console.log('🔌 Connecting to MongoDB...');
    
    // Create new connection promise
    connectionPromise = connectWithRetry(uri, options);

    const connection = await connectionPromise;

    // Set up event listeners
    setupEventListeners();

    return connection;
  } catch (error) {
    console.error('❌ Failed to establish MongoDB connection:', error);
    connectionPromise = null;
    isConnected = false;
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('✅ MongoDB disconnected successfully');
      isConnected = false;
      connectionPromise = null;
    } else {
      console.log('ℹ️  MongoDB already disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

/**
 * Get connection status with detailed information
 */
export function getConnectionStatus(): ConnectionState {
  const state = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    isConnected: state === 1,
    readyState: state,
    readyStateText: states[state] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    port: mongoose.connection.port || undefined,
    user: mongoose.connection.user || undefined,
  };
}

/**
 * Get detailed connection information
 */
export function getConnectionInfo() {
  const status = getConnectionStatus();
  const connection = mongoose.connection;
  
  return {
    ...status,
    models: Object.keys(connection.models),
    collections: Object.keys(connection.collections),
    db: {
      databaseName: connection.name,
      server: connection.host,
      readyState: connection.readyState,
    },
  };
}

/**
 * Check if database is connected
 */
export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Setup MongoDB event listeners
 */
function setupEventListeners(): void {
  mongoose.connection.on('connected', () => {
    console.log('📡 MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('📴 MongoDB disconnected');
    isConnected = false;
    connectionPromise = null;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
    isConnected = true;
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
  });
}

/**
 * Get Mongoose connection object
 */
export function getConnection(): typeof mongoose.connection {
  return mongoose.connection;
}

/**
 * Clean up function for graceful shutdown
 */
export async function cleanup(): Promise<void> {
  await disconnectDB();
}

/**
 * Health check function for API routes
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  details: ConnectionState;
}> {
  try {
    const status = getConnectionStatus();
    
    if (status.isConnected) {
      return {
        status: 'healthy',
        message: 'MongoDB connection is active',
        details: status,
      };
    }
    
    if (status.readyState === 2) {
      return {
        status: 'degraded',
        message: 'MongoDB connection is being established',
        details: status,
      };
    }
    
    return {
      status: 'unhealthy',
      message: 'MongoDB connection is not active',
      details: status,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: getConnectionStatus(),
    };
  }
}

/**
 * Force reconnect to database
 */
export async function forceReconnect(): Promise<void> {
  try {
    await disconnectDB();
    connectionPromise = null;
    isConnected = false;
    await connectDB();
    console.log('✅ Force reconnected to MongoDB');
  } catch (error) {
    console.error('❌ Force reconnect failed:', error);
    throw error;
  }
}

// Export mongoose for direct access
export { mongoose, mongoose as db };

// Export default connection promise for backward compatibility
export default connectDB;
