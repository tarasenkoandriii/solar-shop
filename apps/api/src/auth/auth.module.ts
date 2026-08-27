import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // АУДИТ 27.08.2026: тут стояв фолбек `?? 'dev-secret-change-me'`.
        // Це найгірша з можливих поведінок при незаданій змінній: застосунок
        // мовчки піднімався і підписував сесії константою, яка лежить у
        // репозиторії у відкритому вигляді — тобто будь-хто міг підписати
        // собі `{ sub, role: 'ADMIN' }` і отримати всю адмінку, причому в
        // логах не було б жодного сліду. Відсутність секрета мусить ронити
        // застосунок, а не знижувати його захист.
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET не задано — застосунок не запускається. Згенеруй секрет (`openssl rand -base64 48`) і додай його в оточення; див. .env.example.');
        }
        // Окремо відсікаємо саме те значення, що раніше було фолбеком, —
        // воно досі прописане літералом у docker-compose.yml старих копій.
        if (secret === 'dev-secret-change-me') {
          throw new Error('JWT_SECRET дорівнює публічно відомій dev-константі. Заміни його на власний секрет — інакше сесії підробляє будь-хто, хто бачив репозиторій.');
        }
        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
