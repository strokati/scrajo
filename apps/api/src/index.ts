import { createApp } from './app.js';

const app = await createApp();

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

await app.listen({ host, port });
