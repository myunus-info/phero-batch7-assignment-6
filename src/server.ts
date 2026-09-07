import { Server } from 'http';
import app from './app';
import { config } from './app/config';
import { prisma } from './app/lib/prisma';
import { main } from './app/utils/seed';

let server: Server;

async function bootstrap() {
  try {
    main()
      .catch(e => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
    server = app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.log('HTTP Server closed.');
      });
    }
    prisma.$disconnect();
    process.exit(1);
  };

  const unexpectedErrorHandler = (error: unknown) => {
    console.error('Unexpected error detected:', error);
    exitHandler();
  };

  process.on('uncaughtException', unexpectedErrorHandler);
  process.on('unhandledRejection', unexpectedErrorHandler);

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Gracefully shutting down...');
    if (server) {
      server.close();
    }
  });
}

bootstrap();
