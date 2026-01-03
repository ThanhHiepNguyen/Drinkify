import { Controller, Post, Body, UseGuards, Patch, Param, Get, Delete, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  @Get()
  getAll(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productService.getAllProducts(categoryId, search, page, limit);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  delete(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
