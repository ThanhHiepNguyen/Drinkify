import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) { }

  async createProduct(data: CreateProductDto) {
    const existingProduct = await this.prisma.product.findFirst({
      where: { name: data.name },
    });

    if (existingProduct) {
      throw new ConflictException('Tên sản phẩm đã tồn tại');
    }


    const category = await this.prisma.category.findUnique({
      where: { categoryId: data.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    if (!category.isActive) {
      throw new ConflictException('Không thể thêm sản phẩm vào danh mục đã bị vô hiệu hóa');
    }

    if (!data.options || data.options.length === 0) {
      throw new ConflictException('Sản phẩm phải có ít nhất 1 option');
    }

    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        thumbnail: data.thumbnail,
        options: {
          create: data.options.map(option => ({
            size: option.size,
            material: option.material,
            threadType: option.threadType,
            headType: option.headType,
            price: option.price,
            salePrice: option.salePrice,
            discountPercent: option.discountPercent,
            stockQuantity: option.stockQuantity,
            unit: option.unit || 'Cái',
            image: option.image,
            isActive: option.isActive !== undefined ? option.isActive : true,
          })),
        },
      },
      select: {
        productId: true,
        name: true,
        description: true,
        categoryId: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            categoryId: true,
            name: true,
          },
        },
        options: {
          select: {
            optionId: true,
            size: true,
            material: true,
            threadType: true,
            headType: true,
            price: true,
            salePrice: true,
            discountPercent: true,
            stockQuantity: true,
            unit: true,
            image: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    return product;
  }
  async updateProduct(productId: string, data: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { productId },
    });

    if (!existingProduct) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    // Kiểm tra tên sản phẩm trùng lặp nếu có thay đổi
    if (data.name && data.name !== existingProduct.name) {
      const nameExists = await this.prisma.product.findFirst({
        where: { name: data.name },
      });

      if (nameExists) {
        throw new ConflictException('Tên sản phẩm đã tồn tại');
      }
    }


    if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { categoryId: data.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Danh mục không tồn tại');
      }

      if (!category.isActive) {
        throw new ConflictException('Không thể chuyển sản phẩm sang danh mục đã bị vô hiệu hóa');
      }
    }


    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
    };

    if (data.options && data.options.length > 0) {
      updateData.options = {
        deleteMany: {},
        create: data.options.map(option => ({
          size: option.size,
          material: option.material,
          threadType: option.threadType,
          headType: option.headType,
          price: option.price,
          salePrice: option.salePrice,
          discountPercent: option.discountPercent,
          stockQuantity: option.stockQuantity,
          unit: option.unit || 'Cái',
          image: option.image,
          isActive: option.isActive !== undefined ? option.isActive : true,
        })),
      };
    }

    const updatedProduct = await this.prisma.product.update({
      where: { productId },
      data: updateData,
      select: {
        productId: true,
        name: true,
        description: true,
        categoryId: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            categoryId: true,
            name: true,
          },
        },
        options: {
          select: {
            optionId: true,
            size: true,
            material: true,
            threadType: true,
            headType: true,
            price: true,
            salePrice: true,
            discountPercent: true,
            stockQuantity: true,
            unit: true,
            image: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    return updatedProduct;
  }

  async getAllProducts(
    categoryId?: string,
    search?: string,
    page?: string,
    limit?: string,
  ) {
    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          productId: true,
          name: true,
          description: true,
          categoryId: true,
          thumbnail: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              categoryId: true,
              name: true,
            },
          },
          options: {
            where: { isActive: true },
            select: {
              optionId: true,
              size: true,
              price: true,
              salePrice: true,
              discountPercent: true,
              stockQuantity: true,
              unit: true,
              image: true,
            },
            orderBy: {
              price: 'asc',
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
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
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

  async getProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
      select: {
        productId: true,
        name: true,
        description: true,
        categoryId: true,
        thumbnail: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            categoryId: true,
            name: true,
            description: true,
          },
        },
        options: {
          where: { isActive: true },
          select: {
            optionId: true,
            size: true,
            material: true,
            threadType: true,
            headType: true,
            price: true,
            salePrice: true,
            discountPercent: true,
            stockQuantity: true,
            unit: true,
            image: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
        reviews: {
          select: {
            reviewId: true,
            rating: true,
            comment: true,
            reply: true,
            repliedAt: true,
            createdAt: true,
            user: {
              select: {
                userId: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            options: true,
            reviews: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    
    const avgRating = await this.prisma.review.aggregate({
      where: { productId },
      _avg: {
        rating: true,
      },
    });

    return {
      ...product,
      averageRating: avgRating._avg.rating || 0,
    };
  }

  async deleteProduct(productId: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { productId },
      include: {
        options: {
          where: { isActive: true },
        },
      },
    });

    if (!existingProduct) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    if (existingProduct.options.length === 0) {
      throw new ConflictException('Sản phẩm đã bị khóa (không còn option nào active)');
    }


    await this.prisma.productOption.updateMany({
      where: {
        productId: productId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Khóa sản phẩm thành công',
      productId: productId,
      name: existingProduct.name,
    };
  }
}
