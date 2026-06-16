import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter } as any);

const admin = await prisma.user.findUnique({ where: { matricule: '0000001A' } });
console.log('Admin:', admin?.id, '| deleted:', admin?.deletedAt);

const byId = await prisma.user.findUnique({ where: { id: 'cmpoauwqi000vzrib2aqrqx9e' } });
console.log('By JWT sub:', byId?.matricule ?? 'NOT FOUND');

await prisma.$disconnect();
