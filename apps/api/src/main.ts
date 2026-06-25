import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { readPortEnv } from "@biketrips/config";

import { AppModule } from "./app.module.js";

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = readPortEnv("API_PORT", 4000);

  app.enableCors({
    origin: process.env.API_CORS_ORIGIN ?? "*",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle("BikeTrips API")
    .setDescription("REST API for BikeTrips MVP")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(port);
  console.log(`BikeTrips API is listening on http://localhost:${port}`);
}
