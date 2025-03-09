import { PrismaClient } from '@prisma/client';

// 防止开发环境下热重载创建多个实例
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 如果全局变量中没有prisma实例，则创建一个新的PrismaClient实例
export const prisma = globalForPrisma.prisma || new PrismaClient();

// 如果不是生产环境，则将prisma实例存储到全局变量中
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 导出prisma实例
export default prisma;