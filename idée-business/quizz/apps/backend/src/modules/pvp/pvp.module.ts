import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EloService } from './services/elo.service';
import { MatchmakingService } from './services/matchmaking.service';
import { MatchService } from './services/match.service';
import { PvpGateway } from './gateways/pvp.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [EloService, MatchmakingService, MatchService, PvpGateway],
  exports: [EloService, MatchmakingService, MatchService, PvpGateway],
})
export class PvpModule implements OnModuleInit {
  constructor(
    private pvpGateway: PvpGateway,
    private matchmakingService: MatchmakingService,
    private matchService: MatchService,
  ) {}

  onModuleInit() {
    // Inject services into gateway to avoid circular dependency
    this.pvpGateway.setMatchmakingService(this.matchmakingService);
    this.pvpGateway.setMatchService(this.matchService);
  }
}
