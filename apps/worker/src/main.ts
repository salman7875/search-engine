import { createFileProcessWorker } from "@repo/queue";

const start = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const worker = createFileProcessWorker();
    console.log("File process worker started running!");

    const shutdown = async () => {
      console.log("Closing worker connection");
      await worker.close();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
};

start();