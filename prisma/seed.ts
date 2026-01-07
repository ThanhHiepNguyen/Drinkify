import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Bắt đầu seed dữ liệu...');

    // Xóa dữ liệu cũ (theo thứ tự ngược lại)
    console.log('🗑️  Xóa dữ liệu cũ...');
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.review.deleteMany();
    await prisma.productOption.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Tạo User
    console.log('👤 Tạo user...');
    const passwordHash = await bcrypt.hash('123456', 10);

    const user = await prisma.user.create({
        data: {
            email: 'test@example.com',
            passwordHash,
            fullName: 'Người dùng Test',
            phone: '0123456789',
            role: 'CUSTOMER',
        },
    });

    console.log(`✅ Đã tạo user: ${user.email} (password: 123456)`);

    // Tạo Category
    console.log('📁 Tạo category...');
    const category1 = await prisma.category.create({
        data: {
            name: 'Đồ uống có cồn',
            description: 'Các loại đồ uống có cồn',
        },
    });

    const category2 = await prisma.category.create({
        data: {
            name: 'Đồ uống không cồn',
            description: 'Các loại đồ uống không cồn',
        },
    });

    console.log(`✅ Đã tạo ${2} categories`);

    // Tạo Product với Options
    console.log('🍺 Tạo products...');

    const product1 = await prisma.product.create({
        data: {
            name: 'Bia Tiger',
            description: 'Bia Tiger chai 330ml, hương vị đậm đà',
            categoryId: category1.categoryId,
            thumbnail: 'https://example.com/tiger.jpg',
            options: {
                create: [
                    {
                        size: '330ml',
                        price: 15000,
                        salePrice: 12000,
                        discountPercent: 20,
                        stockQuantity: 100,
                        unit: 'Chai',
                        image: 'https://example.com/tiger-330.jpg',
                    },
                    {
                        size: '500ml',
                        price: 20000,
                        salePrice: 18000,
                        discountPercent: 10,
                        stockQuantity: 50,
                        unit: 'Chai',
                        image: 'https://example.com/tiger-500.jpg',
                    },
                ],
            },
        },
    });

    const product2 = await prisma.product.create({
        data: {
            name: 'Coca Cola',
            description: 'Nước ngọt Coca Cola',
            categoryId: category2.categoryId,
            thumbnail: 'https://example.com/coca.jpg',
            options: {
                create: [
                    {
                        size: '330ml',
                        price: 10000,
                        stockQuantity: 200,
                        unit: 'Lon',
                        image: 'https://example.com/coca-330.jpg',
                    },
                    {
                        size: '500ml',
                        price: 12000,
                        stockQuantity: 150,
                        unit: 'Chai',
                        image: 'https://example.com/coca-500.jpg',
                    },
                ],
            },
        },
    });

    const product3 = await prisma.product.create({
        data: {
            name: 'Bia Heineken',
            description: 'Bia Heineken nhập khẩu',
            categoryId: category1.categoryId,
            thumbnail: 'https://example.com/heineken.jpg',
            options: {
                create: [
                    {
                        size: '330ml',
                        price: 25000,
                        salePrice: 22000,
                        discountPercent: 12,
                        stockQuantity: 80,
                        unit: 'Chai',
                        image: 'https://example.com/heineken-330.jpg',
                    },
                ],
            },
        },
    });

    console.log(`✅ Đã tạo ${3} products`);

    // Lấy các options để tạo cart items
    const options = await prisma.productOption.findMany({
        where: {
            productId: {
                in: [product1.productId, product2.productId, product3.productId],
            },
        },
    });

    const option1 = options.find(o => o.productId === product1.productId && o.size === '330ml');
    const option2 = options.find(o => o.productId === product2.productId && o.size === '330ml');
    const option3 = options.find(o => o.productId === product3.productId && o.size === '330ml');

    // Tạo Cart với CartItems
    console.log('🛒 Tạo cart với items...');

    const cart = await prisma.cart.create({
        data: {
            userId: user.userId,
            items: {
                create: [
                    {
                        productId: product1.productId,
                        optionId: option1?.optionId,
                        quantity: 2,
                        savedPrice: option1?.salePrice || option1?.price || 0,
                    },
                    {
                        productId: product2.productId,
                        optionId: option2?.optionId,
                        quantity: 3,
                        savedPrice: option2?.salePrice || option2?.price || 0,
                    },
                    {
                        productId: product3.productId,
                        optionId: option3?.optionId,
                        quantity: 1,
                        savedPrice: option3?.salePrice || option3?.price || 0,
                    },
                ],
            },
        },
    });

    // Tính totalPrice
    const cartItems = await prisma.cartItem.findMany({
        where: { cartId: cart.cartId },
    });

    const totalPrice = cartItems.reduce((sum, item) => {
        return sum + item.savedPrice * item.quantity;
    }, 0);

    await prisma.cart.update({
        where: { cartId: cart.cartId },
        data: { totalPrice },
    });

    console.log(`✅ Đã tạo cart với ${cartItems.length} items`);
    console.log(`💰 Total price: ${totalPrice.toLocaleString('vi-VN')} VNĐ`);

    console.log('\n✨ Seed hoàn tất!');
    console.log('\n📝 Thông tin đăng nhập:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: 123456`);
    console.log(`   User ID: ${user.userId}`);
}

main()
    .catch((e) => {
        console.error('❌ Lỗi khi seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

