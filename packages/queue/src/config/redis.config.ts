import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis-infra",
    port: Number(process.env.REDIS_PORT) || 6379,
    reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
  },
});

redisClient.on("error", (err) => console.error("Redis Error:", err));

export default redisClient;