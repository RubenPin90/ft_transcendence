export default function handleShutdown({ fastify }) {
    async function gracefulShutdown() {
      fastify.close()
        .then(() => {
          process.exit(0);
        })
        .catch(closeErr => {
          console.error('Error closing Fastify server:', closeErr);
          process.exit(1);
        });
    }
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }