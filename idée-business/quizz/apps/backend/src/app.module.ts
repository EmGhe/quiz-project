import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AuthModule } from './modules/auth/auth.module';
import { DailyModule } from './modules/daily/daily.module';
import { AdminModule } from './modules/admin/admin.module';
import { CollectionModule } from './modules/collection/collection.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { PvpModule } from './modules/pvp/pvp.module';
import { GoldModule } from './modules/gold/gold.module';
import { FragmentModule } from './modules/fragments/fragment.module';
import { PackModule } from './modules/packs/pack.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    QuestionsModule,
    AuthModule,
    DailyModule,
    AdminModule,
    CollectionModule,
    ProxyModule,
    PvpModule,
    GoldModule,
    FragmentModule,
    PackModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
