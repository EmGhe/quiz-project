import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { DailyService } from '../../src/modules/daily/daily.service';

async function main() {
  console.log('🧪 Testing Daily generation with balanced selection...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dailyService = app.get(DailyService);

  try {
    const daily = await dailyService['generateDailyIfNeeded']();

    if (daily) {
      console.log(`\n✅ Daily #${daily.dailyNumber} generated successfully!`);
    } else {
      console.log('\n⚠️  Daily already exists for today');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await app.close();
}

main();
