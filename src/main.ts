import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cấu hình cookie parser
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
