import amqp, { Channel } from 'amqplib';
import { config } from '../config/dotenv';
import { MongoUserModel } from '../database/mongoose/MongoUser';

const QUEUE_NAME = 'user_sync_queue';

let channel: Channel | null = null;

export const initRabbitMQ = async (): Promise<void> => {
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    if (!channel) return;

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());

        if (event.type === 'USER_CREATED') {
          await MongoUserModel.create({
            _id: event.data.id,
            userName: event.data.userName,
            role: event.data.role,
            status: event.data.status,
            syncedAt: new Date(),
          });
        } else if (event.type === 'USER_STATUS_UPDATED') {
          await MongoUserModel.findByIdAndUpdate(event.data.id, {
            status: event.data.status,
            syncedAt: new Date(),
          });
        }

        channel?.ack(msg);
      } catch (err) {
        channel?.nack(msg, false, false);
      }
    });
  } catch (error) {
  }
};

export const publishUserEvent = (type: 'USER_CREATED' | 'USER_STATUS_UPDATED', data: any): void => {
  if (!channel) {
    return;
  }
  const payload = Buffer.from(JSON.stringify({ type, data }));
  channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
};