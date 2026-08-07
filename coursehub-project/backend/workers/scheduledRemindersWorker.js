require("dotenv").config();

const db = require("../db");
const {
  generateMissingCollectionActions,
  processDueCollectionActions,
} = require("../services/financial/invoiceCollectionActionService");

function getConfig() {
  return {
    batchSize: Number(process.env.SCHEDULED_REMINDERS_WORKER_BATCH_SIZE) || 50,
    // Dates here are day-granularity, not minute-granularity like the
    // email outbox -- an hourly poll is already far more frequent
    // than needed, but cheap and simple, so no separate cron
    // infrastructure was introduced for this.
    pollIntervalMs: Number(process.env.SCHEDULED_REMINDERS_WORKER_POLL_INTERVAL_MS) || 3600000,
    // Kill switch: set SCHEDULED_REMINDERS_WORKER_ENABLED=false to
    // stop generating/processing without deploying code (restart the
    // worker process to pick up the change).
    enabled: process.env.SCHEDULED_REMINDERS_WORKER_ENABLED !== "false",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCycle(config = getConfig()) {
  if (!config.enabled) {
    return { generated: 0, claimed: 0, processed: 0, skipped: 0 };
  }

  const { affectedRows: generated } = await generateMissingCollectionActions(db);
  const { claimed, processed, skipped } = await processDueCollectionActions(db, {
    batchSize: config.batchSize,
  });

  return { generated, claimed, processed, skipped };
}

async function startWorker() {
  const config = getConfig();
  let running = true;

  console.log(
    `[scheduledRemindersWorker] starting (batchSize=${config.batchSize}, pollIntervalMs=${config.pollIntervalMs}, enabled=${config.enabled}, autoLock=${process.env.ENABLE_ENROLLMENT_AUTO_LOCK === "true"})`
  );

  function requestShutdown(signal) {
    console.log(`[scheduledRemindersWorker] received ${signal}, shutting down after current cycle`);
    running = false;
  }

  process.on("SIGINT", () => requestShutdown("SIGINT"));
  process.on("SIGTERM", () => requestShutdown("SIGTERM"));

  while (running) {
    try {
      const result = await runCycle(config);

      // Logged every cycle, not just when something happened -- at
      // this worker's hourly poll interval, an unconditional line is
      // still cheap and doubles as the "alive" heartbeat the other
      // worker has to simulate separately at its much faster interval.
      console.log(
        `[scheduledRemindersWorker] cycle: generated=${result.generated} claimed=${result.claimed} processed=${result.processed} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error("[scheduledRemindersWorker] cycle error:", error.message);
    }

    if (running) {
      await sleep(config.pollIntervalMs);
    }
  }

  await db.promise().end();
  console.log("[scheduledRemindersWorker] stopped");
}

if (require.main === module) {
  startWorker();
}

module.exports = { runCycle, getConfig };
