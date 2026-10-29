import { SandboxedJob } from "bullmq";
import { main } from "../index.js";


export default async function fileProcess(job: SandboxedJob) {
  const response = await fetch(job.data);
  const data = await response.json();

  main(data)

  return {
    message: "Success!",
  };
}
