import 'dotenv/config';
import { PrismaClient } from '../../generated/client.js';

export const prisma = new PrismaClient();
