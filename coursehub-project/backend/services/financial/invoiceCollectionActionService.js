const { withTransaction } = require("../../utils/dbTransaction");
const { recalculateFinancialContractStatus } = require("./contractFinancialService");
const { createFinancialEvent } = require("./financialEventService");
const { createNotificationEvent } = require("../notifications/notificationService");
const { resolveStudentOwner } = require("../notifications/notificationRecipientResolvers");
const { formatDateOnly } = require("../../utils/appConfig");

// Terminal invoice states -- once an invoice reaches one of these,
// any collection action still pending for it is stale and should be
// skipped rather than acted on. This is the "processing-time" half
// of pending-invalidation; the other half already existed before
// this stage: invoiceService/invoiceAmountService/
// invoiceCancellationService/paymentService/paymentRefundService all
// DELETE pending/skipped collection_actions the moment an invoice
// closes, so in practice most stale rows never reach this check --
// this is a defensive backstop for the narrow race where an action
// becomes due in the same window the invoice is being closed.
const OPEN_INVOICE_STATUSES = new Set(["pending", "processing", "overdue"]);

function isAutoLockEnabled() {
  return process.env.ENABLE_ENROLLMENT_AUTO_LOCK === "true";
}

/**
 * Idempotently creates the 6 scheduled collection_actions for every
 * still-open invoice that doesn't have them yet. All 6 scheduled_for
 * dates are computed server-side from due_date via DATE_ADD, not in
 * JS, to avoid the JS-Date/timezone bug class already hit elsewhere
 * in this project. ON DUPLICATE KEY UPDATE id=id is a deliberate
 * no-op -- it relies on UNIQUE(invoice_id, action_type) to make a
 * re-run across invoices that already have some/all rows completely
 * safe, and critically it never resets an already processed/skipped
 * row back to pending.
 */
async function generateMissingCollectionActions(db) {
  const [result] = await db.promise().query(`
    INSERT INTO invoice_collection_actions (invoice_id, action_type, status, scheduled_for)
    SELECT i.id, offsets.action_type, 'pending', DATE_ADD(i.due_date, INTERVAL offsets.day_offset DAY)
    FROM invoices i
    CROSS JOIN (
      SELECT 'reminder_3_days_before' AS action_type, -3 AS day_offset
      UNION ALL SELECT 'due_date_notice', 0
      UNION ALL SELECT 'marked_overdue', 1
      UNION ALL SELECT 'overdue_charge_10_days', 10
      UNION ALL SELECT 'lock_warning_15_days', 15
      UNION ALL SELECT 'enrollment_locked_30_days', 30
    ) AS offsets
    WHERE i.status IN ('pending', 'processing', 'overdue')
    ON DUPLICATE KEY UPDATE invoice_collection_actions.id = invoice_collection_actions.id
  `);

  // affectedRows counts 1 per real insert and 0 per no-op duplicate
  // (MySQL's own semantics for ON DUPLICATE KEY UPDATE with an
  // unchanged value) -- an approximate "how many were actually new".
  return { affectedRows: result.affectedRows };
}

async function notifyInvoiceReminder(db, connection, action, reminderKind) {
  const recipient = await resolveStudentOwner(connection, { studentId: action.student_id });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.invoice.reminder",
    sourceType: "invoice_collection_action",
    sourceId: action.id,
    courseId: action.course_id,
    context: {
      collectionActionId: action.id,
      invoiceId: action.invoice_id,
      invoiceDescription: action.description,
      reminderKind,
      dueDate: formatDateOnly(action.due_date),
      courseId: action.course_id,
      courseName: action.course_name,
    },
    recipients: [recipient],
    connection,
  });
}

async function notifyInvoiceOverdue(db, connection, action) {
  const recipient = await resolveStudentOwner(connection, { studentId: action.student_id });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.invoice.overdue",
    sourceType: "invoice",
    sourceId: action.invoice_id,
    courseId: action.course_id,
    context: {
      invoiceId: action.invoice_id,
      invoiceDescription: action.description,
      dueDate: formatDateOnly(action.due_date),
      courseId: action.course_id,
      courseName: action.course_name,
    },
    recipients: [recipient],
    connection,
  });
}

async function notifyOverdueChargeWarning(db, connection, action) {
  const recipient = await resolveStudentOwner(connection, { studentId: action.student_id });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.invoice.overdue_charge_warning",
    sourceType: "invoice",
    sourceId: action.invoice_id,
    courseId: action.course_id,
    context: {
      invoiceId: action.invoice_id,
      invoiceDescription: action.description,
      dueDate: formatDateOnly(action.due_date),
      courseId: action.course_id,
      courseName: action.course_name,
    },
    recipients: [recipient],
    connection,
  });
}

async function notifyLockWarning(db, connection, action) {
  const recipient = await resolveStudentOwner(connection, { studentId: action.student_id });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.enrollment.lock_warning",
    sourceType: "invoice",
    sourceId: action.invoice_id,
    courseId: action.course_id,
    context: {
      invoiceId: action.invoice_id,
      invoiceDescription: action.description,
      dueDate: formatDateOnly(action.due_date),
      courseId: action.course_id,
      courseName: action.course_name,
    },
    recipients: [recipient],
    connection,
  });
}

async function notifyEnrollmentLocked(db, connection, action) {
  const recipient = await resolveStudentOwner(connection, { studentId: action.student_id });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.enrollment.locked",
    sourceType: "enrollment",
    sourceId: action.enrollment_id,
    courseId: action.course_id,
    context: {
      invoiceId: action.invoice_id,
      invoiceDescription: action.description,
      dueDate: formatDateOnly(action.due_date),
      courseId: action.course_id,
      courseName: action.course_name,
    },
    recipients: [recipient],
    connection,
  });
}

/**
 * Processes exactly one collection_actions row, re-checking its
 * status under FOR UPDATE first (so two overlapping worker cycles,
 * or a retried transaction, never double-act on the same row).
 * Returns the terminal status it wrote, or null if another process
 * had already claimed/handled it first.
 */
async function processCollectionAction(db, actionId) {
  return withTransaction(db, async (connection) => {
    const [rows] = await connection.query(
      `
        SELECT
          aca.id, aca.invoice_id, aca.action_type, aca.status,
          i.status AS invoice_status, i.description, i.due_date,
          fc.id AS financial_contract_id, fc.enrollment_id,
          en.student_id, en.course_id, en.status AS enrollment_status,
          c.name AS course_name
        FROM invoice_collection_actions aca
        INNER JOIN invoices i ON i.id = aca.invoice_id
        INNER JOIN financial_contracts fc ON fc.id = i.financial_contract_id
        INNER JOIN enrollments en ON en.id = fc.enrollment_id
        INNER JOIN courses c ON c.id = en.course_id
        WHERE aca.id = ?
        FOR UPDATE
      `,
      [actionId]
    );

    if (rows.length === 0 || rows[0].status !== "pending") {
      return null;
    }

    const action = rows[0];

    if (!OPEN_INVOICE_STATUSES.has(action.invoice_status)) {
      await connection.query(
        `UPDATE invoice_collection_actions SET status = 'skipped', processed_at = NOW() WHERE id = ?`,
        [actionId]
      );

      return "skipped";
    }

    let finalStatus = "processed";

    switch (action.action_type) {
      case "reminder_3_days_before":
        await notifyInvoiceReminder(db, connection, action, "reminder_3_days_before");
        break;

      case "due_date_notice":
        await notifyInvoiceReminder(db, connection, action, "due_date_notice");
        break;

      case "marked_overdue": {
        const [updateResult] = await connection.query(
          `UPDATE invoices SET status = 'overdue' WHERE id = ? AND status IN ('pending', 'processing')`,
          [action.invoice_id]
        );

        if (updateResult.affectedRows > 0) {
          await recalculateFinancialContractStatus(connection, action.financial_contract_id);

          await createFinancialEvent(connection, {
            financialContractId: action.financial_contract_id,
            invoiceId: action.invoice_id,
            enrollmentId: action.enrollment_id,
            eventType: "invoice_marked_overdue",
            source: "system",
            previousValue: { invoiceStatus: action.invoice_status },
            newValue: { invoiceStatus: "overdue" },
            reason: "Vencimento ultrapassado sem pagamento confirmado (lembrete programado).",
          });

          await notifyInvoiceOverdue(db, connection, action);
        } else {
          // Already 'overdue' through some other path -- nothing
          // changed, so nothing to notify.
          finalStatus = "skipped";
        }

        break;
      }

      case "overdue_charge_10_days":
        await notifyOverdueChargeWarning(db, connection, action);
        break;

      case "lock_warning_15_days":
        await notifyLockWarning(db, connection, action);
        break;

      case "enrollment_locked_30_days":
        if (isAutoLockEnabled()) {
          const [lockResult] = await connection.query(
            `
              UPDATE enrollments
              SET status = 'locked',
                  locked_at = NOW(),
                  lock_reason = 'financial_overdue',
                  lock_note = ?
              WHERE id = ? AND status <> 'locked'
            `,
            [`Bloqueio automático por atraso na fatura #${action.invoice_id}.`, action.enrollment_id]
          );

          if (lockResult.affectedRows > 0) {
            await createFinancialEvent(connection, {
              financialContractId: action.financial_contract_id,
              invoiceId: action.invoice_id,
              enrollmentId: action.enrollment_id,
              eventType: "enrollment_locked_automatically",
              source: "system",
              previousValue: { enrollmentStatus: action.enrollment_status },
              newValue: { enrollmentStatus: "locked", lockReason: "financial_overdue" },
              reason: `Fatura #${action.invoice_id} vencida há 30 dias sem pagamento (lembrete programado).`,
            });

            await notifyEnrollmentLocked(db, connection, action);
          } else {
            // Already locked through some other path -- nothing
            // changed, so nothing to notify.
            finalStatus = "skipped";
          }
        } else {
          // ENABLE_ENROLLMENT_AUTO_LOCK is off (the default) -- the
          // action is scheduled but intentionally not acted on, so
          // no lock and no "your enrollment was locked" notification
          // that would be false.
          finalStatus = "skipped";
        }

        break;

      default:
        finalStatus = "skipped";
    }

    await connection.query(
      `UPDATE invoice_collection_actions SET status = ?, processed_at = NOW() WHERE id = ?`,
      [finalStatus, actionId]
    );

    return finalStatus;
  });
}

/**
 * Finds up to `batchSize` collection_actions that are due
 * (status='pending', scheduled_for <= today) and processes them one
 * at a time. Each one re-verifies its own pending status under a row
 * lock inside processCollectionAction, so this outer read doesn't
 * need FOR UPDATE SKIP LOCKED itself -- unlike the email delivery
 * outbox, this worker isn't expected to run with multiple concurrent
 * instances, and the per-row guard makes it safe even if it did.
 */
async function processDueCollectionActions(db, { batchSize = 50 } = {}) {
  const [rows] = await db.promise().query(
    `
      SELECT id
      FROM invoice_collection_actions
      WHERE status = 'pending' AND scheduled_for <= CURDATE()
      ORDER BY scheduled_for ASC, id ASC
      LIMIT ?
    `,
    [batchSize]
  );

  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    const result = await processCollectionAction(db, row.id);

    if (result === "processed") {
      processed += 1;
    } else if (result === "skipped") {
      skipped += 1;
    }
  }

  return { claimed: rows.length, processed, skipped };
}

module.exports = {
  isAutoLockEnabled,
  generateMissingCollectionActions,
  processCollectionAction,
  processDueCollectionActions,
};
