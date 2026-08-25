import 'dotenv/config';
import { createApp } from './app';

const PORT = parseInt(process.env.API_PORT ?? '4000', 10);

const app = createApp();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║        MediKiosk API Server              ║
  ╠══════════════════════════════════════════╣
  ║  Status   : Running                     ║
  ║  Port     : ${PORT}                         ║
  ║  Docs     : http://localhost:${PORT}/api/docs║
  ║  Health   : http://localhost:${PORT}/health  ║
  ╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
