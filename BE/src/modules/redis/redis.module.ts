import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

@Global()
@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: () => {
                if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
                    throw new Error('REDIS_HOST and REDIS_PORT must be defined in environment variables');
                }

                return new Redis({
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT, 10),
                    password: process.env.REDIS_PASSWORD,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: 3,
                });
            },
        },
        RedisService,
    ],
    exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule { }

