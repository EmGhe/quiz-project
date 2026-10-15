import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected, reusing socket');
      return this.socket;
    }

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    console.log('[WebSocket] Connecting to:', BACKEND_URL);

    this.socket = io(BACKEND_URL, {
      withCredentials: true, // Send cookies automatically (for HTTP-only token cookie)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] ✅ Connected successfully! Socket ID:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] ❌ Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] ❌ Connection error:', error);
      console.error('[WebSocket] Error details:', {
        message: error.message,
        type: (error as any).type,
        description: (error as any).description,
      });
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.disconnect();
      }
    });

    console.log('[WebSocket] Socket instance created, waiting for connection...');
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[WebSocket] Manually disconnected');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Matchmaking events
  joinQueue() {
    this.socket?.emit('matchmaking:join');
  }

  leaveQueue() {
    this.socket?.emit('matchmaking:leave');
  }

  // Match events
  submitAnswer(matchId: string, questionIndex: number, choice: string, timeMs: number) {
    this.socket?.emit('answer:submit', { matchId, questionIndex, choice, timeMs });
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const websocketService = new WebSocketService();
