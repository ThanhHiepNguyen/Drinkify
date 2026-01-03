import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  async createCategory(data: CreateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { name: data.name }
    });

    if (existingCategory) {
      throw new ConflictException('Tên danh mục đã tồn tại');
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      select: {
        categoryId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return category;
  }

  async getAllCategories(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const categories = await this.prisma.category.findMany({
      where,
      select: {
        categoryId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return categories;
  }

  async getCategoryById(categoryId: string, page?: string, limit?: string, sortBy?: string) {
    const currentPage = page ? parseInt(page, 10) : undefined;
    const currentLimit = limit ? parseInt(limit, 10) : undefined;
    const sortOrder = sortBy === 'asc' ? 'asc' : 'desc';
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
      select: {
        categoryId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    const pageNum = currentPage ?? 1;
    const limitNum = currentLimit ?? 12;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { categoryId },
        skip,
        take: limitNum,
        select: {
          productId: true,
          name: true,
          description: true,
          thumbnail: true,
          createdAt: true,
          updatedAt: true,
          options: {
            where: { isActive: true },
            select: {
              optionId: true,
              price: true,
              salePrice: true,
              discountPercent: true,
              stockQuantity: true,
              unit: true,
              sku: true,
              image: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: {
              price: sortOrder,
            },
          },
          _count: {
            select: {
              options: true,
              reviews: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({
        where: { categoryId },
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      ...category,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  async updateCategory(categoryId: string, data: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { categoryId },
    });

    if (!existingCategory) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    if (data.name && data.name !== existingCategory.name) {
      const nameExists = await this.prisma.category.findUnique({
        where: { name: data.name },
      });

      if (nameExists) {
        throw new ConflictException('Tên danh mục đã tồn tại');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { categoryId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        categoryId: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedCategory;
  }

  async deleteCategory(categoryId: string) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { categoryId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    if (existingCategory._count.products > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục. Danh mục này đang có ${existingCategory._count.products} sản phẩm. Vui lòng xóa hoặc chuyển sản phẩm sang danh mục khác trước.`
      );
    }

    await this.prisma.category.delete({
      where: { categoryId },
    });

    return {
      message: 'Xóa danh mục thành công',
    };
  }
}
