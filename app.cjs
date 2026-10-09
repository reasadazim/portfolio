// Passenger loads a CommonJS startup file; the application uses ES modules.
import("./server/server.js").catch(() => {
  console.error("Could not load the portfolio server. Check the deployment files and dependencies.");
  process.exit(1);
});
