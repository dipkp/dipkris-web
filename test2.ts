import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

async function main() {
  const trpc = createTRPCClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
        transformer: superjson
      })
    ]
  });

  try {
    const res = await trpc.room.create.mutate({ name: "Testing", hostName: "Test" });
    console.log("Success", res);
  } catch(e) {
    console.error("Error", e);
  }
}
main();
