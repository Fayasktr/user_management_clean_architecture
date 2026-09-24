import { createApp } from './app';
import { config, validateEnv } from '../infrastructure/config/dotenv';
import { connectSQL, prisma } from '../infrastructure/config/sql';
import { connectMongo, disconnectMongo } from '../infrastructure/config/mongo';
import { initRabbitMQ } from '../infrastructure/messaging/rabbitmq';

const startServer = async () => {
  try {
    validateEnv();

    await connectSQL();
    await connectMongo();
    await initRabbitMQ();

    const app = createApp();

    app.listen(config.port, () => {
      console.log(`Server Running at http://localhost:${config.port}`);
    });

  } catch (error) {
    console.error('Server Startup Error: ', error);
    process.exit(1);
  }
};

startServer();