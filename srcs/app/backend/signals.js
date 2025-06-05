// shutdown.js
export default function handleShutdown({ fastify, wss }) {
    async function gracefulShutdown() {
      wss.close(() => {
        fastify.close()
          .then(() => {
            console.log('Fastify server closed');
            process.exit(0);
          })
          .catch(closeErr => {
            console.error('Error closing Fastify server:', closeErr);
            process.exit(1);
          });
      });
    }
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }


