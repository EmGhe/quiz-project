import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

// Note: Requires @nestjs/websockets @nestjs/platform-socket.io socket.io
// Install with: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class PvpGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId
  private rematchRequests = new Map<string, { requesterId: string; opponentId: string; timeout: NodeJS.Timeout }>(); // matchId -> request data

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    // Services will be injected via setter to avoid circular dependency
  ) {}

  private matchmakingService: any;
  private matchService: any;

  setMatchmakingService(service: any) {
    this.matchmakingService = service;
  }

  setMatchService(service: any) {
    this.matchService = service;
  }

  /**
   * Handle client connection with JWT authentication
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake (auth, headers, or cookies)
      let token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      // If no token in auth/headers, try to get it from cookies
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';');
        const tokenCookie = cookies.find((c) => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1].trim();
        }
      }

      if (!token) {
        console.error('[WebSocket] No token found in handshake', {
          hasAuth: !!client.handshake.auth.token,
          hasAuthHeader: !!client.handshake.headers.authorization,
          hasCookie: !!client.handshake.headers.cookie,
          cookies: client.handshake.headers.cookie,
        });
        client.disconnect();
        return;
      }

      console.log('[WebSocket] Token found, verifying...');

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token);

      if (!payload.sub) {
        console.error('[WebSocket] Invalid JWT payload - no sub:', payload);
        client.disconnect();
        return;
      }

      const userId = payload.sub;

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      });

      if (!user) {
        console.error('[WebSocket] User not found:', userId);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.username = user.username;

      this.connectedUsers.set(client.id, user.id);

      console.log(`[WebSocket] User ${user.username} (${user.id}) connected`);

      // Join user to their personal room
      client.join(`user:${user.id}`);

      // If user has an active match, rejoin the match room
      const activeMatch = await this.prisma.pvpMatch.findFirst({
        where: {
          OR: [{ player1Id: user.id }, { player2Id: user.id }],
          status: 'in_progress',
        },
        orderBy: { startedAt: 'desc' },
      });

      if (activeMatch) {
        client.join(`match:${activeMatch.id}`);
        console.log(`[WebSocket] User ${user.id} rejoined active match room ${activeMatch.id}`);
      }
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      console.log(`User ${userId} disconnected`);

      // Emit disconnect event to matchmaking service
      this.server.emit('user:disconnected', { userId });
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send message to match room
   */
  sendToMatch(matchId: string, event: string, data: any) {
    const room = `match:${matchId}`;
    const sockets = this.server.in(room).allSockets();
    sockets.then((socketIds) => {
      console.log(`[WebSocket] Sending ${event} to match ${matchId} (${socketIds.size} clients in room)`);
    });
    this.server.to(room).emit(event, data);
  }

  /**
   * Join match room
   */
  joinMatchRoom(userId: string, matchId: string) {
    const socketId = Array.from(this.connectedUsers.entries()).find(
      ([_, uid]) => uid === userId,
    )?.[0];

    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`match:${matchId}`);
        console.log(`[WebSocket] User ${userId} joined match room ${matchId}`);
      } else {
        console.error(`[WebSocket] Socket not found for user ${userId}`);
      }
    } else {
      console.error(`[WebSocket] User ${userId} not connected, cannot join match room`);
    }
  }

  /**
   * Leave match room
   */
  leaveMatchRoom(userId: string, matchId: string) {
    const socketId = Array.from(this.connectedUsers.entries()).find(
      ([_, uid]) => uid === userId,
    )?.[0];

    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      socket?.leave(`match:${matchId}`);
    }
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).includes(userId);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Handle join queue request
   */
  @SubscribeMessage('matchmaking:join')
  async handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    if (this.matchmakingService) {
      await this.matchmakingService.joinQueue(client.userId);
    }
  }

  /**
   * Handle leave queue request
   */
  @SubscribeMessage('matchmaking:leave')
  handleLeaveQueue(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    if (this.matchmakingService) {
      this.matchmakingService.leaveQueue(client.userId);
    }
  }

  /**
   * Handle answer submission
   */
  @SubscribeMessage('answer:submit')
  async handleSubmitAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      matchId: string;
      questionIndex: number;
      choice: string;
      timeMs: number;
    },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    if (this.matchService) {
      await this.matchService.submitAnswer(
        data.matchId,
        client.userId,
        data.questionIndex,
        data.choice,
        data.timeMs,
      );
    }
  }

  /**
   * Handle rematch request
   */
  @SubscribeMessage('rematch:request')
  async handleRematchRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string; opponentId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    console.log(`[Rematch] ${client.userId} requests rematch with ${data.opponentId} for match ${data.matchId}`);

    // Clear any existing timeout for this match
    const existingRequest = this.rematchRequests.get(data.matchId);
    if (existingRequest) {
      clearTimeout(existingRequest.timeout);
    }

    // Create timeout that auto-declines after 10 seconds
    const timeout = setTimeout(() => {
      console.log(`[Rematch] Request for match ${data.matchId} timed out`);
      this.rematchRequests.delete(data.matchId);
      this.sendToUser(client.userId!, 'rematch:declined', {});
    }, 10000);

    // Store the request
    this.rematchRequests.set(data.matchId, {
      requesterId: client.userId,
      opponentId: data.opponentId,
      timeout,
    });

    // Send request to opponent
    this.sendToUser(data.opponentId, 'rematch:request', {
      matchId: data.matchId,
      requesterId: client.userId,
    });
  }

  /**
   * Handle rematch accept
   */
  @SubscribeMessage('rematch:accept')
  async handleRematchAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const request = this.rematchRequests.get(data.matchId);
    if (!request) {
      console.log(`[Rematch] No pending request found for match ${data.matchId}`);
      return { error: 'No pending rematch request' };
    }

    // Clear timeout
    clearTimeout(request.timeout);
    this.rematchRequests.delete(data.matchId);

    console.log(`[Rematch] ${client.userId} accepted rematch from ${request.requesterId}`);

    // Create new match between same players
    // This will automatically send 'match:created' to both players
    if (this.matchmakingService) {
      await this.matchmakingService.createMatch(
        request.requesterId,
        client.userId,
      );
    }
  }

  /**
   * Handle rematch decline
   */
  @SubscribeMessage('rematch:decline')
  async handleRematchDecline(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const request = this.rematchRequests.get(data.matchId);
    if (!request) {
      console.log(`[Rematch] No pending request found for match ${data.matchId}`);
      return { error: 'No pending rematch request' };
    }

    // Clear timeout
    clearTimeout(request.timeout);
    this.rematchRequests.delete(data.matchId);

    console.log(`[Rematch] ${client.userId} declined rematch from ${request.requesterId}`);

    // Notify requester
    this.sendToUser(request.requesterId, 'rematch:declined', {});
  }
}
