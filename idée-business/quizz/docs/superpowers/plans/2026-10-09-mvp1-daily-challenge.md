# MVP1 - Daily Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core Daily Challenge game loop - 10 questions per day, scoring with speed bonus and multiplier, streak system, daily leaderboard, and result sharing.

**Architecture:** REST API endpoints for daily questions and submissions, PostgreSQL for users/dailies/submissions, server-side scoring validation to prevent timer manipulation, React components for quiz UI with countdown timer.

**Tech Stack:**
- Backend: NestJS modules (auth, users, daily, submissions)
- Frontend: React components, Zustand state, countdown timer
- Database: PostgreSQL (users, dailies, daily_questions, submissions)
- Auth: JWT with HTTP-only cookies

**Spec:** `/Users/hichamghermani/Desktop/projects/idée-business/quizz/brainstorm/vision_globale.md` sections 3-7, 19-20

## Global Constraints

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- PostgreSQL >= 15.0
- All scoring calculations MUST happen server-side (Global Constraint from Review Focus #2)
- Answer timestamps MUST be server-validated (no client timestamps)
- Questions served with server timestamp for timing validation
- Passwords hashed with bcrypt (min 10 rounds)
- JWTs signed with HS256, stored in HTTP-only cookies
- Daily resets at UTC midnight
- Maximum 25 seconds per question (enforced server-side)

## Review Focus

1. **Timer manipulation prevention** - Client cannot forge answer timestamps; server records question-served time and validates answer timestamp is within 25s window
2. **Concurrent Daily submissions** - Two users submitting Daily #142 simultaneously must both get valid, independent scores without race conditions
3. **Streak calculation edge cases** - User completing Daily at 23:59:59 then again at 00:00:01 should not break streak; timezone handling must be consistent (UTC)
4. **Answer matching case-sensitivity** - "États-Unis", "USA", "Etats-Unis" must all match against accepted_answers variants without false negatives
5. **Score calculation overflow** - Multiplier + speed bonus cannot create scores > max safe integer; validate bounds

---

## Task 1: Database Schema for Users & Auth

**Files:**
- Create: `apps/backend/prisma/migrations/[timestamp]_add_users_auth/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: Prisma schema from initialization
- Produces: User model with `id`, `username`, `email`, `passwordHash`, `createdAt`, JWT service with `sign(userId)` and `verify(token)` returning `userId`

### Prisma Schema Addition

Add to `schema.prisma`:

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  submissions DailySubmission[]
  streaks     UserStreak[]

  @@map("users")
}

model UserStreak {
  id             String   @id @default(uuid())
  userId         String
  currentStreak  Int      @default(0)
  longestStreak  Int      @default(0)
  lastDailyDate  String?  // YYYY-MM-DD format, UTC
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
  @@map("user_streaks")
}
```

**Steps:**

- [ ] **Step 1: Update schema.prisma with User and UserStreak models**

Add the models above to `apps/backend/prisma/schema.prisma`

- [ ] **Step 2: Generate migration**

```bash
cd apps/backend
pnpm prisma:migrate:dev --name add_users_auth
```

Expected: Migration file created, tables `users` and `user_streaks` exist in database

- [ ] **Step 3: Verify tables**

```bash
pnpm prisma:studio
```

Expected: Can see `users` and `user_streaks` tables in Prisma Studio

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma
git commit -m "feat(db): add User and UserStreak models"
```

---

## Task 2: Auth Module (JWT + Registration/Login)

**Files:**
- Create: `apps/backend/src/modules/auth/auth.module.ts`
- Create: `apps/backend/src/modules/auth/auth.service.ts`
- Create: `apps/backend/src/modules/auth/auth.controller.ts`
- Create: `apps/backend/src/modules/auth/dto/register.dto.ts`
- Create: `apps/backend/src/modules/auth/dto/login.dto.ts`
- Create: `apps/backend/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/backend/src/common/decorators/current-user.decorator.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/package.json` (add bcrypt, @nestjs/jwt)

**Interfaces:**
- Consumes: User model from Task 1
- Produces: Auth endpoints `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, JWT guard for protecting routes, `@CurrentUser()` decorator returning `userId`

### Installation

Add dependencies:

```bash
cd apps/backend
pnpm add bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add -D @types/bcrypt @types/passport-jwt
```

### DTOs

**register.dto.ts:**

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**login.dto.ts:**

```typescript
import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  usernameOrEmail: string;

  @IsString()
  password: string;
}
```

### Auth Service

**auth.service.ts:**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          { email: dto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
      },
    });

    await this.prisma.userStreak.create({
      data: { userId: user.id },
    });

    const token = this.jwtService.sign({ sub: user.id });

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.usernameOrEmail },
          { email: dto.usernameOrEmail },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id });

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token,
    };
  }

  async validateToken(token: string): Promise<string> {
    try {
      const payload = this.jwtService.verify(token);
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, createdAt: true },
    });
  }
}
```

### Auth Controller

**auth.controller.ts:**

```typescript
import { Controller, Post, Get, Body, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ user: result.user });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('token');
    return res.json({ message: 'Logged out' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() userId: string) {
    const user = await this.authService.getUserById(userId);
    return { user };
  }
}
```

### JWT Guard

**jwt-auth.guard.ts:**

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.token;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const userId = await this.authService.validateToken(token);
      request.userId = userId;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### Current User Decorator

**current-user.decorator.ts:**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.userId;
  },
);
```

### Auth Module

**auth.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

**Steps:**

- [ ] **Step 1: Install dependencies**

```bash
cd apps/backend
pnpm add bcrypt @nestjs/jwt @nestjs/passport passport passport-jwt class-validator class-transformer
pnpm add -D @types/bcrypt @types/passport-jwt
```

Expected: Dependencies installed

- [ ] **Step 2: Create auth module structure**

```bash
mkdir -p src/modules/auth/dto
mkdir -p src/common/guards
mkdir -p src/common/decorators
```

- [ ] **Step 3: Create all auth files**

Create files listed in Files section with code above

- [ ] **Step 4: Update app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    QuestionsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Enable ValidationPipe in main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.enableCors({
    origin: configService.get('CORS_ORIGIN'),
    credentials: true,
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 6: Install cookie-parser**

```bash
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

- [ ] **Step 7: Test registration**

Start backend, then:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}' \
  -c cookies.txt
```

Expected: `{"user":{"id":"...","username":"testuser","email":"test@test.com"}}`

- [ ] **Step 8: Test login**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"testuser","password":"password123"}' \
  -c cookies.txt
```

Expected: `{"user":{"id":"...","username":"testuser","email":"test@test.com"}}`

- [ ] **Step 9: Test /me endpoint**

```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

Expected: `{"user":{"id":"...","username":"testuser","email":"test@test.com","createdAt":"..."}}`

- [ ] **Step 10: Commit**

```bash
git add apps/backend
git commit -m "feat(auth): add JWT authentication with register/login"
```

---

## Task 3: Daily Schema & Generation

**Files:**
- Create: `apps/backend/prisma/migrations/[timestamp]_add_dailies/migration.sql`
- Modify: `apps/backend/prisma/schema.prisma`

**Interfaces:**
- Consumes: Question model from initialization, User model from Task 1
- Produces: Daily model with `dailyNumber`, `date` (YYYY-MM-DD), DailyQuestion join table, DailySubmission for user answers

### Schema Addition

```prisma
model Daily {
  id          String   @id @default(uuid())
  dailyNumber Int      @unique
  date        String   @unique // YYYY-MM-DD format, UTC
  createdAt   DateTime @default(now())

  questions   DailyQuestion[]
  submissions DailySubmission[]

  @@map("dailies")
}

model DailyQuestion {
  id         String @id @default(uuid())
  dailyId    String
  questionId String
  order      Int    // 1-10

  daily    Daily    @relation(fields: [dailyId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id])

  @@unique([dailyId, order])
  @@map("daily_questions")
}

model DailySubmission {
  id                 String   @id @default(uuid())
  userId             String
  dailyId            String
  score              Int
  totalTime          Int      // milliseconds
  correctCount       Int
  answersData        Json     // [{questionId, answer, correct, timeMs, pointsEarned}]
  submittedAt        DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  daily Daily @relation(fields: [dailyId], references: [id], onDelete: Cascade)

  @@unique([userId, dailyId])
  @@index([dailyId, score])
  @@map("daily_submissions")
}
```

Add to Question model:

```prisma
model Question {
  // ... existing fields ...
  
  dailyQuestions DailyQuestion[]
}
```

**Steps:**

- [ ] **Step 1: Update schema with Daily models**

Add models above to `schema.prisma`

- [ ] **Step 2: Generate migration**

```bash
cd apps/backend
pnpm prisma:migrate:dev --name add_dailies
```

Expected: Tables `dailies`, `daily_questions`, `daily_submissions` created

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma
git commit -m "feat(db): add Daily, DailyQuestion, DailySubmission models"
```

---

## Task 4: Daily Module - Generation & Retrieval

**Files:**
- Create: `apps/backend/src/modules/daily/daily.module.ts`
- Create: `apps/backend/src/modules/daily/daily.service.ts`
- Create: `apps/backend/src/modules/daily/daily.controller.ts`
- Create: `apps/backend/src/modules/daily/dto/submit-daily.dto.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Daily models from Task 3, AuthService from Task 2
- Produces: `GET /api/daily/today` returning current daily with questions and server timestamp, `POST /api/daily/submit` accepting answers with timing

### Daily Service

**daily.service.ts:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DailyService {
  constructor(private prisma: PrismaService) {}

  private getTodayDateUTC(): string {
    return new Date().toISOString().split('T')[0];
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyIfNeeded() {
    const today = this.getTodayDateUTC();
    const existing = await this.prisma.daily.findUnique({
      where: { date: today },
    });

    if (existing) return;

    const lastDaily = await this.prisma.daily.findFirst({
      orderBy: { dailyNumber: 'desc' },
    });

    const dailyNumber = (lastDaily?.dailyNumber || 0) + 1;

    // Select 10 random published questions
    const questions = await this.prisma.question.findMany({
      where: { status: 'publie' },
      include: { acceptedAnswers: true },
      take: 100,
    });

    if (questions.length < 10) {
      throw new Error('Not enough published questions for daily');
    }

    // Shuffle and take 10
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);

    const daily = await this.prisma.daily.create({
      data: {
        dailyNumber,
        date: today,
        questions: {
          create: shuffled.map((q, idx) => ({
            questionId: q.id,
            order: idx + 1,
          })),
        },
      },
    });

    console.log(`✅ Generated Daily #${dailyNumber} for ${today}`);
    return daily;
  }

  async getTodaysDaily(userId: string) {
    const today = this.getTodayDateUTC();
    
    let daily = await this.prisma.daily.findUnique({
      where: { date: today },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: { acceptedAnswers: true },
            },
          },
        },
      },
    });

    if (!daily) {
      await this.generateDailyIfNeeded();
      daily = await this.prisma.daily.findUnique({
        where: { date: today },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              question: {
                include: { acceptedAnswers: true },
              },
            },
          },
        },
      });
    }

    // Check if user already submitted
    const submission = await this.prisma.dailySubmission.findUnique({
      where: {
        userId_dailyId: { userId, dailyId: daily.id },
      },
    });

    return {
      dailyNumber: daily.dailyNumber,
      date: daily.date,
      alreadyCompleted: !!submission,
      submission: submission || null,
      questions: daily.questions.map((dq) => ({
        questionId: dq.question.id,
        text: dq.question.text,
        order: dq.order,
        acceptedAnswers: dq.question.acceptedAnswers,
      })),
      serverTimestamp: Date.now(),
    };
  }

  async submitDaily(userId: string, answers: Array<{questionId: string; answer: string; timeMs: number}>) {
    const today = this.getTodayDateUTC();
    const daily = await this.prisma.daily.findUnique({
      where: { date: today },
      include: {
        questions: {
          include: {
            question: {
              include: { acceptedAnswers: true },
            },
          },
        },
      },
    });

    if (!daily) {
      throw new Error('No daily available');
    }

    // Check if already submitted
    const existing = await this.prisma.dailySubmission.findUnique({
      where: {
        userId_dailyId: { userId, dailyId: daily.id },
      },
    });

    if (existing) {
      throw new Error('Daily already completed');
    }

    // Validate and score answers
    const questionMap = new Map(
      daily.questions.map((dq) => [dq.question.id, dq.question])
    );

    let totalScore = 0;
    let correctCount = 0;
    let consecutiveCorrect = 0;
    const answersData = [];

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      // Validate time (max 25 seconds = 25000ms)
      if (ans.timeMs > 25000 || ans.timeMs < 0) {
        throw new Error(`Invalid time for question ${ans.questionId}`);
      }

      const acceptedAnswers = question.acceptedAnswers.map((a) =>
        a.answer.toLowerCase().trim()
      );
      const userAnswer = ans.answer.toLowerCase().trim();
      const correct = acceptedAnswers.includes(userAnswer);

      let pointsEarned = 0;

      if (correct) {
        correctCount++;
        consecutiveCorrect++;

        // Base points: 100
        let basePoints = 100;

        // Speed bonus
        if (ans.timeMs <= 3000) basePoints += 100;
        else if (ans.timeMs <= 7000) basePoints += 90;
        else if (ans.timeMs <= 11000) basePoints += 80;
        else if (ans.timeMs <= 15000) basePoints += 70;
        else if (ans.timeMs <= 19000) basePoints += 60;
        else if (ans.timeMs <= 22000) basePoints += 50;
        else basePoints += 40;

        // Multiplier based on streak
        let multiplier = 1.0;
        if (consecutiveCorrect === 2) multiplier = 1.1;
        else if (consecutiveCorrect === 3) multiplier = 1.2;
        else if (consecutiveCorrect === 4) multiplier = 1.3;
        else if (consecutiveCorrect >= 5) multiplier = 1.5;

        pointsEarned = Math.floor(basePoints * multiplier);
        totalScore += pointsEarned;
      } else {
        consecutiveCorrect = 0;
      }

      answersData.push({
        questionId: ans.questionId,
        answer: ans.answer,
        correct,
        timeMs: ans.timeMs,
        pointsEarned,
      });
    }

    const totalTime = answers.reduce((sum, a) => sum + a.timeMs, 0);

    // Create submission
    const submission = await this.prisma.dailySubmission.create({
      data: {
        userId,
        dailyId: daily.id,
        score: totalScore,
        totalTime,
        correctCount,
        answersData,
      },
    });

    // Update streak
    await this.updateStreak(userId, today);

    return {
      submission,
      dailyNumber: daily.dailyNumber,
    };
  }

  private async updateStreak(userId: string, todayDate: string) {
    const streak = await this.prisma.userStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastDailyDate: todayDate,
        },
      });
      return;
    }

    if (streak.lastDailyDate === todayDate) {
      // Already updated today
      return;
    }

    const lastDate = streak.lastDailyDate
      ? new Date(streak.lastDailyDate)
      : null;
    const today = new Date(todayDate);

    let newStreak = 1;

    if (lastDate) {
      const daysDiff = Math.floor(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        newStreak = streak.currentStreak + 1;
      }
    }

    const longestStreak = Math.max(streak.longestStreak, newStreak);

    await this.prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastDailyDate: todayDate,
      },
    });
  }

  async getLeaderboard(dailyId: string, limit: number = 100) {
    const submissions = await this.prisma.dailySubmission.findMany({
      where: { dailyId },
      orderBy: [{ score: 'desc' }, { totalTime: 'asc' }],
      take: limit,
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return submissions.map((s, idx) => ({
      rank: idx + 1,
      userId: s.user.id,
      username: s.user.username,
      score: s.score,
      totalTime: s.totalTime,
      correctCount: s.correctCount,
    }));
  }
}
```

### Daily Controller

**daily.controller.ts:**

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DailyService } from './daily.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SubmitDailyDto } from './dto/submit-daily.dto';

@Controller('api/daily')
@UseGuards(JwtAuthGuard)
export class DailyController {
  constructor(private dailyService: DailyService) {}

  @Get('today')
  async getToday(@CurrentUser() userId: string) {
    return this.dailyService.getTodaysDaily(userId);
  }

  @Post('submit')
  async submit(
    @CurrentUser() userId: string,
    @Body() dto: SubmitDailyDto,
  ) {
    return this.dailyService.submitDaily(userId, dto.answers);
  }

  @Get('leaderboard')
  async leaderboard() {
    const today = new Date().toISOString().split('T')[0];
    const daily = await this.dailyService['prisma'].daily.findUnique({
      where: { date: today },
    });
    
    if (!daily) {
      return { leaderboard: [] };
    }

    const leaderboard = await this.dailyService.getLeaderboard(daily.id);
    return { leaderboard };
  }
}
```

### DTO

**submit-daily.dto.ts:**

```typescript
import { IsArray, ValidateNested, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;

  @IsInt()
  @Min(0)
  @Max(25000)
  timeMs: number;
}

export class SubmitDailyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
```

### Daily Module

**daily.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyService } from './daily.service';
import { DailyController } from './daily.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  controllers: [DailyController],
  providers: [DailyService],
})
export class DailyModule {}
```

**Steps:**

- [ ] **Step 1: Install @nestjs/schedule**

```bash
cd apps/backend
pnpm add @nestjs/schedule
```

- [ ] **Step 2: Create daily module files**

```bash
mkdir -p src/modules/daily/dto
```

Create all files listed above

- [ ] **Step 3: Update app.module.ts**

Add `DailyModule` to imports

- [ ] **Step 4: Test GET /api/daily/today**

Login first, then:

```bash
curl http://localhost:3000/api/daily/today -b cookies.txt
```

Expected: JSON with `dailyNumber`, `date`, `questions` array, `serverTimestamp`

- [ ] **Step 5: Test POST /api/daily/submit**

```bash
curl -X POST http://localhost:3000/api/daily/submit \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "answers": [
      {"questionId":"<id>","answer":"test","timeMs":5000}
    ]
  }'
```

Expected: `{"submission":{...},"dailyNumber":1}`

- [ ] **Step 6: Test leaderboard**

```bash
curl http://localhost:3000/api/daily/leaderboard -b cookies.txt
```

Expected: `{"leaderboard":[...]}`

- [ ] **Step 7: Commit**

```bash
git add apps/backend
git commit -m "feat(daily): add Daily module with generation and submission"
```

---

## Task 5: Frontend Auth Pages (Login/Register)

**Files:**
- Create: `apps/frontend/src/pages/LoginPage.tsx`
- Create: `apps/frontend/src/pages/RegisterPage.tsx`
- Create: `apps/frontend/src/api/auth.ts`
- Create: `apps/frontend/src/store/authStore.ts`
- Create: `apps/frontend/src/types/user.ts`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/package.json` (add react-router-dom already installed)

**Interfaces:**
- Consumes: Auth API from Task 2
- Produces: Login/Register pages, auth state management, protected route wrapper

### Auth API

**auth.ts:**

```typescript
import { apiClient } from './client';

export interface User {
  id: string;
  username: string;
  email: string;
}

export const authApi = {
  async register(username: string, email: string, password: string): Promise<User> {
    const response = await apiClient.post('/api/auth/register', {
      username,
      email,
      password,
    });
    return response.data.user;
  },

  async login(usernameOrEmail: string, password: string): Promise<User> {
    const response = await apiClient.post('/api/auth/login', {
      usernameOrEmail,
      password,
    });
    return response.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  async me(): Promise<User> {
    const response = await apiClient.get('/api/auth/me');
    return response.data.user;
  },
};
```

### Auth Store

**authStore.ts:**

```typescript
import { create } from 'zustand';
import { authApi } from '@/api/auth';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  login: async (usernameOrEmail, password) => {
    const user = await authApi.login(usernameOrEmail, password);
    set({ user, loading: false });
  },

  register: async (username, email, password) => {
    const user = await authApi.register(username, email, password);
    set({ user, loading: false });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const user = await authApi.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
```

### Login Page

**LoginPage.tsx:**

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(usernameOrEmail, password);
      navigate('/daily');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-6">
          Quiz Game
        </h1>
        <h2 className="text-xl font-semibold mb-6">Login</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Username or Email
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 font-medium"
          >
            Login
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### Register Page

**RegisterPage.tsx:**

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      navigate('/daily');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-6">
          Quiz Game
        </h1>
        <h2 className="text-xl font-semibold mb-6">Register</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 font-medium"
          >
            Register
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### App Router

**App.tsx:**

```typescript
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

function App() {
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/daily" /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/daily" /> : <RegisterPage />}
        />
        <Route
          path="/daily"
          element={user ? <div>Daily Page (TODO)</div> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/daily" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**Steps:**

- [ ] **Step 1: Create directory structure**

```bash
cd apps/frontend/src
mkdir -p pages store
```

- [ ] **Step 2: Create all auth files**

Create files listed above

- [ ] **Step 3: Update apiClient to use credentials**

In `apps/frontend/src/api/client.ts`, add:

```typescript
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10000,
  withCredentials: true, // Add this line
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- [ ] **Step 4: Test frontend**

```bash
cd apps/frontend
pnpm dev
```

Visit http://localhost:5173

Expected: Redirects to /login

- [ ] **Step 5: Test registration flow**

Register a new user via UI

Expected: Redirects to /daily after successful registration

- [ ] **Step 6: Test login flow**

Logout (if needed), then login

Expected: Redirects to /daily

- [ ] **Step 7: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): add login/register pages with auth"
```

---

**Note:** This plan continues with Tasks 6-12 covering:
- Task 6: Daily Quiz UI Component
- Task 7: Timer & Answer Submission
- Task 8: Results & Leaderboard Display
- Task 9: Streak Display
- Task 10: Share Card Generation
- Task 11: Seed Initial Questions
- Task 12: E2E Testing & Documentation

Due to output length limits, I'll create the remaining MVP plans (MVP2, V2, V3) in separate files.

