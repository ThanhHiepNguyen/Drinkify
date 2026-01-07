import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private readonly logger = new Logger(RedisService.name);
    private isConnected = false;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
        const port = parseInt(this.configService.get<string>('REDIS_PORT') || '6379', 10);
        const db = parseInt(this.configService.get<string>('REDIS_DB') || '0', 10);
        const password = this.configService.get<string>('REDIS_PASSWORD');

        this.client = new Redis({
            host,
            port,
            db,
            ...(password && { password }),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                this.logger.warn(`Redis retry attempt ${times}, delay ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
        });
    }

    async onModuleInit() {
        this.client.on('connect', () => {
            this.logger.log('Redis connecting...');
        });

        this.client.on('ready', () => {
            this.isConnected = true;
            this.logger.log('✅ Redis connected and ready');
        });

        this.client.on('error', (err) => {
            this.isConnected = false;
            this.logger.error(` Redis error: ${err.message}`, err.stack);
        });

        this.client.on('close', () => {
            this.isConnected = false;
            this.logger.warn('Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            this.logger.log('Redis reconnecting...');
        });

        // Kết nối Redis
        try {
            await this.client.connect();
        } catch (error) {
            this.logger.error(`Failed to connect to Redis: ${error.message}`);
            // Không throw để app vẫn chạy được (fallback về DB)
        }
    }

    async onModuleDestroy() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.logger.log('Redis connection closed');
        }
    }

    // Kiểm tra trạng thái kết nối
    isReady(): boolean {
        return this.isConnected && this.client?.status === 'ready';
    }

    // Hash operations
    async hset(key: string, field: string, value: string | number): Promise<number> {
        if (!this.isReady()) {
            throw new Error('Redis is not connected');
        }
        return await this.client.hset(key, field, typeof value === 'number' ? value.toString() : value);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        if (!this.isReady()) {
            return {};
        }
        return await this.client.hgetall(key);
    }

    async hsetJSON(key: string, field: string, value: any): Promise<number> {
        if (!this.isReady()) {
            throw new Error('Redis is not connected');
        }
        return await this.client.hset(key, field, JSON.stringify(value));
    }

    async hdel(key: string, ...fields: string[]): Promise<number> {
        if (!this.isReady()) {
            throw new Error('Redis is not connected');
        }
        return await this.client.hdel(key, ...fields);
    }

    async hincrby(key: string, field: string, increment: number): Promise<number> {
        if (!this.isReady()) {
            throw new Error('Redis is not connected');
        }
        return await this.client.hincrby(key, field, increment);
    }

    async hexists(key: string, field: string): Promise<number> {
        if (!this.isReady()) {
            return 0;
        }
        return await this.client.hexists(key, field);
    }

    async expire(key: string, seconds: number): Promise<number> {
        if (!this.isReady()) {
            return 0;
        }
        return await this.client.expire(key, seconds);
    }

    // Key operations
    async del(key: string): Promise<number> {
        if (!this.isReady()) {
            throw new Error('Redis is not connected');
        }
        return await this.client.del(key);
    }
}

