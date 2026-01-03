import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';



@Module({
  imports: [PrismaModule, UserModule, AuthModule, CategoryModule, ProductModule]
})
export class AppModule { }
