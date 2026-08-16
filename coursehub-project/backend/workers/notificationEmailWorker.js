require("dotenv").config();

const os = require("os");
const db = require("../db");
const { sendEmail } = require("../utils/mailer");
const { buildNotificationEmail } = require("../email/templates/notificationEmail");
const {
  claimBatch,
  markDeliverySent,
  markDeliveryFailed,
  clearRecipientActionPath,
} = require("../services/notifications/notificationDeliveryService");
const { getNotificationType } = require("../services/notifications/notificationTypeRegistry");

function getConfig() {
  return {
    workerId: process.env.NOTIFICATION_WORKER_ID || `${os.hostname()}:${process.pid}`,
    batchSize: Number(process.env.NOTIFICATION_WORKER_BATCH_SIZE) || 25,
    pollIntervalMs: Number(process.env.NOTIFICATION_WORKER_POLL_INTERVAL_MS) || 5000,
    leaseMinutes: Number(process.env.NOTIFICATION_WORKER_LEASE_MINUTES) || 5,
    // Kill switch: set NOTIFICATION_WORKER_ENABLED=false to stop
    // claiming new work without deploying code (restart the worker
    // process to pick up the change -- it's a plain env var, not a
    // live-reloaded flag).
    enabled: process.env.NOTIFICATION_WORKER_ENABLED !== "false",
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes one claimed job. Never throws -- delivery failures are
 * recorded via markDeliveryFailed, not propagated, so one bad
 * recipient/SMTP hiccup never stops the batch. `sendEmailFn` defaults
 * to the real mailer but is injectable so tests can exercise retry/
 * exhaustion logic with a controlled transport instead of hitting a
 * real (or even Ethereal) SMTP server.
 */
async function processJob(job, sendEmailFn = sendEmail) {
  try {
    const { subject, text, html } = buildNotificationEmail({
      title: job.title,
      message: job.message,
      actionPath: job.action_path,
      priority: job.priority,
    });

    const result = await sendEmailFn({ to: job.destination_snapshot, subject, text, html });

    await markDeliverySent(db, {
      deliveryId: job.delivery_id,
      providerMessageId: result.messageId,
    });

    // Um action_path sensível (ver notificationTypeRegistry.js) só
    // existe para levar um destinatário EXTERNO (sem user_id, sem
    // inbox in-app) até um link de uso único -- uma vez entregue, o
    // valor bruto não precisa mais ficar em repouso na tabela.
    if (job.user_id === null && getNotificationType(job.type)?.sensitiveActionPath) {
      await clearRecipientActionPath(db, job.recipient_id);
    }

    console.log(`[notificationEmailWorker] delivery ${job.delivery_id} sent`);
  } catch (error) {
    const { exhausted, newAttemptCount } = await markDeliveryFailed(db, {
      deliveryId: job.delivery_id,
      previousAttemptCount: job.attempt_count,
      errorMessage: error.message,
    });

    console.error(
      `[notificationEmailWorker] delivery ${job.delivery_id} failed (attempt ${newAttemptCount}${
        exhausted ? ", exhausted" : ", will retry"
      }): ${error.message}`
    );
  }
}

async function runCycle(config = getConfig(), sendEmailFn = sendEmail) {
  if (!config.enabled) {
    return { claimed: 0 };
  }

  const jobs = await claimBatch(db, {
    batchSize: config.batchSize,
    workerId: config.workerId,
    leaseMinutes: config.leaseMinutes,
  });

  for (const job of jobs) {
    await processJob(job, sendEmailFn);
  }

  return { claimed: jobs.length };
}

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

async function startWorker() {
  const config = getConfig();
  let running = true;
  let lastHeartbeatAt = Date.now();

  console.log(
    `[notificationEmailWorker] starting (workerId=${config.workerId}, batchSize=${config.batchSize}, pollIntervalMs=${config.pollIntervalMs}, enabled=${config.enabled})`
  );

  function requestShutdown(signal) {
    console.log(`[notificationEmailWorker] received ${signal}, shutting down after current cycle`);
    running = false;
  }

  process.on("SIGINT", () => requestShutdown("SIGINT"));
  process.on("SIGTERM", () => requestShutdown("SIGTERM"));

  // Sequential loop by design -- the next cycle only starts after
  // the previous one (claim + send every job in the batch) fully
  // finishes, so there's never more than one in-flight cycle per
  // worker process.
  while (running) {
    try {
      const { claimed } = await runCycle(config);

      // A quiet worker (nothing to claim) never logs otherwise --
      // without this, "process alive but idle" and "process crashed
      // silently" look identical from the log alone. Only fires on
      // idle cycles; a busy worker's own per-delivery logs already
      // prove it's alive.
      if (claimed === 0 && Date.now() - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
        console.log("[notificationEmailWorker] heartbeat: alive, idle");
        lastHeartbeatAt = Date.now();
      }
    } catch (error) {
      console.error("[notificationEmailWorker] cycle error:", error.message);
    }

    if (running) {
      await sleep(config.pollIntervalMs);
    }
  }

  await db.promise().end();
  console.log("[notificationEmailWorker] stopped");
}

if (require.main === module) {
  startWorker();
}

module.exports = { runCycle, processJob, getConfig };
