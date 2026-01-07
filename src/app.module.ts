import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { OderModule } from './modules/oder/oder.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReviewModule } from './modules/review/review.module';



@Module({
  imports: [PrismaModule, RedisModule, UserModule, AuthModule, CategoryModule, ProductModule, CartModule, OderModule, PaymentModule, ReviewModule]
})
export class AppModule { }
