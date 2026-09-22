import dotenv from "dotenv";
import path from "path";

dotenv.config({path:path.resolve(__dirname,'../../../../.env')});


dotenv.config();

const required_envs=[
    'DATABASE_URL',
    'MONGO_URI',
    'JWT_SECRET'
];

export const validateEnv = (): void => {
  const missingEnvs: string[] = [];
  for (const envKey of required_envs) {
    if (!process.env[envKey]) {
      missingEnvs.push(envKey);
    }
  }
  if (missingEnvs.length > 0) {
    console.error('❌ [FATAL] Missing required environment variables:');
    missingEnvs.forEach((env) => console.error(`   - ${env}`));
    console.error('Please configure them in your .env file before starting the server.\n');
    process.exit(1); 
  }
};


export const config={
    port:parseInt(process.env.PORT||"5000",10),
    nodeEnv:process.env.NODE_ENV||'development',
    databaseUrl:process.env.DATABASE_URL||"",
    mongoUri: process.env.MONGO_URI || '',
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    jwtSecret: process.env.JWT_SECRET || '',
}

