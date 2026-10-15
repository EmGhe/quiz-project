import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PvpGateway } from '../gateways/pvp.gateway';
import { MatchService } from './match.service';

interface QueueEntry {
  userId: string;
  elo: number;
  joinedAt: Date;
}

@Injectable()
export class MatchmakingService {
  private queue: Map<string, QueueEntry> = new Map();
  private readonly INITIAL_ELO_RANGE = 200;
  private readonly ELO_EXPANSION_RATE = 50; // Every 10 seconds
  private readonly MAX_WAIT_TIME = 120000; // 2 minutes

  constructor(
    private prisma: PrismaService,
    private pvpGateway: PvpGateway,
    @Inject(forwardRef(() => MatchService))
    private matchService: MatchService,
  ) {
    // Start matchmaking loop
    this.startMatchmakingLoop();
  }

  /**
   * Add user to matchmaking queue
   */
  async joinQueue(userId: string): Promise<void> {
    // Check if already in queue
    if (this.queue.has(userId)) {
      return;
    }

    // Get user's ELO
    const userElo = await this.prisma.userElo.findUnique({
      where: { userId },
    });

    if (!userElo) {
      // Initialize ELO if not exists
      await this.prisma.userElo.create({
        data: {
          userId,
          elo: 1200,
          rank: 'Bronze',
          division: 3,
        },
      });
    }

    const elo = userElo?.elo || 1200;

    this.queue.set(userId, {
      userId,
      elo,
      joinedAt: new Date(),
    });

    // Notify user
    this.pvpGateway.sendToUser(userId, 'matchmaking:joined', {
      queueSize: this.queue.size,
      estimatedWait: this.estimateWaitTime(),
    });

    console.log(`User ${userId} joined queue (ELO: ${elo}, Queue size: ${this.queue.size})`);
  }

  /**
   * Remove user from queue
   */
  leaveQueue(userId: string): void {
    if (this.queue.delete(userId)) {
      this.pvpGateway.sendToUser(userId, 'matchmaking:left', {});
      console.log(`User ${userId} left queue`);
    }
  }

  /**
   * Matchmaking loop - runs every 5 seconds
   */
  private startMatchmakingLoop() {
    setInterval(() => {
      this.tryMatchPlayers();
    }, 5000);
  }

  /**
   * Try to match players in queue
   */
  private async tryMatchPlayers() {
    if (this.queue.size < 2) {
      return;
    }

    const entries = Array.from(this.queue.values());

    for (let i = 0; i < entries.length; i++) {
      const player1 = entries[i];

      // Calculate ELO range based on wait time
      const waitTime = Date.now() - player1.joinedAt.getTime();
      const expansions = Math.floor(waitTime / 10000); // Every 10 seconds
      const eloRange =
        this.INITIAL_ELO_RANGE + expansions * this.ELO_EXPANSION_RATE;

      // Find suitable opponent
      for (let j = i + 1; j < entries.length; j++) {
        const player2 = entries[j];

        // Check ELO difference
        const eloDiff = Math.abs(player1.elo - player2.elo);

        if (eloDiff <= eloRange) {
          // Match found!
          await this.createMatch(player1.userId, player2.userId);

          // Remove from queue
          this.queue.delete(player1.userId);
          this.queue.delete(player2.userId);

          return; // Process one match per cycle
        }
      }

      // Check max wait time
      if (waitTime >= this.MAX_WAIT_TIME) {
        // Match with anyone
        for (let j = i + 1; j < entries.length; j++) {
          const player2 = entries[j];
          await this.createMatch(player1.userId, player2.userId);
          this.queue.delete(player1.userId);
          this.queue.delete(player2.userId);
          return;
        }
      }
    }
  }

  /**
   * Create a PvP match and start it immediately (no ban phase)
   */
  private async createMatch(
    player1Id: string,
    player2Id: string,
  ): Promise<void> {
    const match = await this.prisma.pvpMatch.create({
      data: {
        player1Id,
        player2Id,
        status: 'waiting', // Will be updated to 'in_progress' by startMatch
        player1BannedCat: [], // Empty for now (ban phase on stand by)
        player2BannedCat: [],
      },
    });

    console.log(`Match created: ${match.id} (${player1Id} vs ${player2Id})`);

    // Join match rooms
    this.pvpGateway.joinMatchRoom(player1Id, match.id);
    this.pvpGateway.joinMatchRoom(player2Id, match.id);

    // Notify both players that match was found
    this.pvpGateway.sendToMatch(match.id, 'match:created', {
      matchId: match.id,
      player1Id,
      player2Id,
      status: 'waiting',
    });

    // Start match immediately (skip ban phase)
    await this.matchService.startMatch(match.id);
  }

  /**
   * Estimate wait time based on queue size
   */
  private estimateWaitTime(): number {
    if (this.queue.size < 2) {
      return 60000; // 1 minute if alone
    }
    return 30000; // 30 seconds if others in queue
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get queue status for user
   */
  getQueueStatus(userId: string) {
    const entry = this.queue.get(userId);
    if (!entry) {
      return null;
    }

    const waitTime = Date.now() - entry.joinedAt.getTime();
    const expansions = Math.floor(waitTime / 10000);
    const currentRange =
      this.INITIAL_ELO_RANGE + expansions * this.ELO_EXPANSION_RATE;

    return {
      position: Array.from(this.queue.keys()).indexOf(userId) + 1,
      waitTime,
      queueSize: this.queue.size,
      eloRange: currentRange,
      estimatedWait: this.estimateWaitTime(),
    };
  }
}
