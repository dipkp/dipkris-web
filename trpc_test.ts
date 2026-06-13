import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { appRouter } from './api/router.js'; // Adjust path

async function main() {
  try {
    const response = await fetch("http://localhost:3000/api/trpc/room.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": {
          "json": {
            "name": "Test Room",
            "hostName": "Placi"
          }
        }
      })
    });
    const text = await response.text();
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}
main();
