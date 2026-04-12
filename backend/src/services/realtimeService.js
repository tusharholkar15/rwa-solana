const Redis = require('ioredis');
const { Server } = require('socket.io');

/**
 * Realtime Service using Redis Pub/Sub and WebSockets (Socket.io)
 * Handles live updates for asset prices, order books, governance, and events.
 */
class RealtimeService {
  constructor() {
    this.io = null;
    this.redisPub = null;
    this.redisSub = null;
    this.isInitialized = false;
  }

  /**
   * Initialize WebSockets + Redis
   */
  init(httpServer) {
    if (this.isInitialized) return;

    // We can fallback to an in-memory setup if REDIS_URL is purely local or not set for quick dev
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    
    try {
      this.redisPub = new Redis(redisUrl, { lazyConnect: true });
      this.redisSub = new Redis(redisUrl, { lazyConnect: true });

      // Handle Redis connection errors gracefully (especially in dev without local Redis)
      this.redisPub.on('error', (err) => console.warn('[Realtime] Redis Pub connection failed (will use memory fallback)'));
      this.redisSub.on('error', (err) => console.warn('[Realtime] Redis Sub connection failed (will use memory fallback)'));
    } catch (e) {
      console.warn('[Realtime] Redis initialization skipped.');
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // For dev; restrict in prod
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketEvents();
    this.setupRedisSubscriptions();
    
    this.isInitialized = true;
    console.log('[RealtimeService] WebSocket server initialized');
  }

  setupSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log(`[Realtime] Client connected: ${socket.id}`);

      // Client subscribes to an asset's data feed (price, order book)
      socket.on('subscribe:asset', (assetId) => {
        socket.join(`asset:${assetId}`);
        console.log(`[Realtime] ${socket.id} joined asset:${assetId}`);
      });

      socket.on('unsubscribe:asset', (assetId) => {
        socket.leave(`asset:${assetId}`);
      });

      // Subscribe to platform-wide governance events
      socket.on('subscribe:governance', () => {
        socket.join('governance');
      });

      // Subscribe to user-specific encrypted updates (portfolio, yield)
      socket.on('subscribe:portfolio', (walletAddress) => {
        socket.join(`portfolio:${walletAddress}`);
      });

      socket.on('disconnect', () => {
        // console.log(`[Realtime] Client disconnected: ${socket.id}`);
      });
    });
  }

  setupRedisSubscriptions() {
    if (!this.redisSub) return;
    
    // Subscribe to backend-wide channels
    this.redisSub.subscribe('asset_updates', 'trade_events', 'governance_events', (err, count) => {
      if (err) {
        // console.error('[Realtime] Failed to subscribe to Redis channels', err);
        return;
      }
    });

    this.redisSub.on('message', (channel, message) => {
      try {
        const payload = JSON.parse(message);
        
        switch(channel) {
          case 'asset_updates':
            // e.g., payload = { type: 'PRICE_UPDATE', assetId: '...', data: {...} }
            this.io.to(`asset:${payload.assetId}`).emit('asset_event', payload);
            break;
            
          case 'trade_events':
            // e.g., payload = { type: 'ORDER_FILLED', assetId: '...', data: {...} }
            this.io.to(`asset:${payload.assetId}`).emit('trade_event', payload);
            break;

          case 'governance_events':
            this.io.to('governance').emit('gov_event', payload);
            break;
        }
      } catch (err) {
        console.error('[Realtime] Message parse error', err);
      }
    });
  }

  /**
   * Broadcast an update
   */
  publish(channel, payload) {
    if (!this.isInitialized) return;

    // Send immediately via Socket.io to local clients
    if (channel.startsWith('asset:')) {
      this.io.to(channel).emit('asset_event', payload);
    } else if (channel.startsWith('governance')) {
      this.io.to(channel).emit('gov_event', payload);
    } else if (channel.startsWith('portfolio:')) {
      this.io.to(channel).emit('portfolio_event', payload);
    } else if (channel === 'trade_events' || channel === 'price_update') {
      // Broadcast to specific asset room + firehose
      this.io.emit(channel, payload); 
      if (payload.assetId) {
        this.io.to(`asset:${payload.assetId}`).emit(channel, payload);
      }
    } else if (channel === 'WARN_ORACLE_BREACH') {
      this.io.emit('WARN_ORACLE_BREACH', payload);
    }

    // Also push to Redis for cross-node replication (if running in cluster)
    if (this.redisPub && this.redisPub.status === 'ready') {
      let redisChannel = 'asset_updates';
      if (channel.startsWith('governance')) redisChannel = 'governance_events';
      if (channel.startsWith('portfolio')) redisChannel = 'portfolio_updates'; 
      if (channel === 'trade_events' || channel === 'price_update' || channel === 'WARN_ORACLE_BREACH') {
         redisChannel = channel;
      }
      
      this.redisPub.publish(redisChannel, JSON.stringify(payload)).catch(() => {});
    }
  }
}

module.exports = new RealtimeService();
