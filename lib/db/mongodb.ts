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
let __isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;
let retryAttempts = 0;
let eventListenersSetup = false;
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
    serverSelectionTimeoutMS: 10000, // How long to try selecting a server (increased for DNS resolution)
    socketTimeoutMS: 45000, // How long a send or receive on a socket can take before timeout
    
    // Retry configuration
    retryWrites: true,
    retryReads: true,
    
    // Additional options
    connectTimeoutMS: 30000,
    
    // Buffer commands until connected - prevents "Cannot call X before initial connection" in serverless
    // when metadata/layout and API run in parallel or connection is still establishing.
    bufferCommands: true,
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
    __isConnected = true;
    retryAttempts = 0;
    
    return connection;
  } catch (error: any) {
    retryAttempts++;
    
    // Provide helpful error messages for common issues
    if (error?.code === 'ETIMEOUT' || error?.syscall === 'querySrv') {
      console.error('❌ MongoDB DNS resolution timeout. Possible causes:');
      console.error('   - Network connectivity issues');
      console.error('   - DNS server problems');
      console.error('   - Firewall blocking MongoDB connections');
      console.error('   - MongoDB Atlas cluster might be paused');
      console.error('   - VPN or proxy interference');
    }
    
    if (retryAttempts < MAX_RETRY_ATTEMPTS) {
      console.error(
        `❌ MongoDB connection failed (attempt ${retryAttempts}/${MAX_RETRY_ATTEMPTS}):`,
        error?.message || error
      );
      console.log(`Retrying in ${RETRY_DELAY * retryAttempts}ms...`);
      
      await sleep(RETRY_DELAY * retryAttempts); // Exponential backoff
      
      return connectWithRetry(uri, options);
    } else {
      console.error('❌ MongoDB connection failed after max retry attempts:', error);
      __isConnected = false;
      throw error;
    }
  }
}

/**
 * Connect to the database
 * Uses connection caching for serverless environments
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Check if already connected first (fastest check)
  if (mongoose.connection.readyState === 1) {
    // Ensure event listeners are set up even if connection already exists
    if (!eventListenersSetup) {
      setupEventListeners();
    }
    return mongoose;
  }

  // Return existing connection promise if available (prevents multiple simultaneous connections)
  if (connectionPromise) {
    return connectionPromise;
  }

  // If connecting (e.g. another request started connect), wait for that connection to complete
  // instead of starting a duplicate connection.
  if (mongoose.connection.readyState === 2) {
    const maxWait = 15000; // 15s max wait for in-flight connection
    const step = 50;
    let elapsed = 0;
    while (mongoose.connection.readyState === 2 && elapsed < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, step));
      elapsed += step;
    }
    if (mongoose.connection.readyState === 1) {
      if (!eventListenersSetup) {
        setupEventListeners();
      }
      return mongoose;
    }
    // Still connecting after maxWait - fall through to create/await connectionPromise below
  }

  try {
    const uri = getDatabaseUri();
    const options = getConnectionOptions();

    console.log('🔌 Connecting to MongoDB...');
    
    // Create new connection promise
    connectionPromise = connectWithRetry(uri, options);

    const connection = await connectionPromise;

    // Set up event listeners (only once)
    setupEventListeners();

    // Clear promise after successful connection
    connectionPromise = null;

    return connection;
  } catch (error) {
    console.error('❌ Failed to establish MongoDB connection:', error);
    connectionPromise = null;
    __isConnected = false;
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
      __isConnected = false;
      connectionPromise = null;
      eventListenersSetup = false; // Reset flag on disconnect
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
    isConnected: __isConnected && state === 1,
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
 * Only sets up listeners once to prevent memory leaks
 */
function setupEventListeners(): void {
  // Prevent duplicate event listeners
  if (eventListenersSetup) {
    return;
  }

  // Increase max listeners to prevent warnings in development
  mongoose.connection.setMaxListeners(20);

  // Remove existing listeners before adding new ones (safety check)
  mongoose.connection.removeAllListeners('connected');
  mongoose.connection.removeAllListeners('error');
  mongoose.connection.removeAllListeners('disconnected');
  mongoose.connection.removeAllListeners('reconnected');

  mongoose.connection.on('connected', () => {
    console.log('📡 MongoDB connected');
  });

  mongoose.connection.on('error', (error: any) => {
    console.error('❌ MongoDB connection error:', error);
    
    // Handle DNS timeout errors specifically
    if (error?.code === 'ETIMEOUT' || error?.syscall === 'querySrv') {
      console.error('⚠️  DNS resolution timeout detected. This is usually a network issue.');
      console.error('   The connection may still work if retried. Check your network connection.');
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.log('📴 MongoDB disconnected');
    __isConnected = false;
    connectionPromise = null;
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
    __isConnected = true;
  });

  // Handle application termination (only set up once)
  if (!process.listenerCount('SIGINT')) {
    process.on('SIGINT', async () => {
      await disconnectDB();
      process.exit(0);
    });
  }

  if (!process.listenerCount('SIGTERM')) {
    process.on('SIGTERM', async () => {
      await disconnectDB();
      process.exit(0);
    });
  }

  eventListenersSetup = true;
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
    __isConnected = false;
    await connectDB();
    console.log('✅ Force reconnected to MongoDB');
  } catch (error) {
    console.error('❌ Force reconnect failed:', error);
    throw error;
  }
}

// Handle unhandled promise rejections related to MongoDB DNS timeouts
// This prevents crashes from DNS timeouts that occur during reconnection attempts
if (typeof process !== 'undefined' && !process.listenerCount('unhandledRejection')) {
  process.on('unhandledRejection', (reason: any, promise) => {
    // Only handle MongoDB-related DNS timeout unhandled rejections
    if (reason?.code === 'ETIMEOUT' && reason?.syscall === 'querySrv') {
      console.error('⚠️  Unhandled MongoDB DNS timeout (this is usually a network issue):');
      console.error('   Error:', reason.message || reason);
      console.error('   The application will continue, but some MongoDB operations may fail.');
      console.error('   Check your network connection and MongoDB Atlas cluster status.');
      // Don't crash the app - just log the error
      return;
    }
    
    // For other unhandled rejections in development, log them
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    }
  });
}

// Export mongoose for direct access
export { mongoose, mongoose as db };

// Export default connection promise for backward compatibility
export default connectDB;
