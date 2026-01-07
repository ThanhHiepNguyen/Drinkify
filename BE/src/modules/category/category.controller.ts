import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Get()
  getAll(@Query('isActive') isActive?: string) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.categoryService.getAllCategories(isActiveBool);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.categoryService.getCategoryById(id, page, limit, sortBy);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  delete(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
