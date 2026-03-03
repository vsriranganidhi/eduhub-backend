import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away any extra data that shouldn't be there
    forbidNonWhitelisted: true, // Throws an error if extra data is sent
    transform: true, // Automatically converts types (e.g., string to number)
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
