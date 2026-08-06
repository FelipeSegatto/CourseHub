const { createNotificationEvent } = require("../notifications/notificationService");
const { resolveStudentOwner } = require("../notifications/notificationRecipientResolvers");

/**
 * Shared by invoiceService/invoiceAmountService/invoiceCancellationService/
 * paymentService/paymentRefundService -- unlike grades/attendance
 * (one teacher-side owner + one admin caller), the financial domain
 * has several sibling services that each need the same invoice ->
 * financial_contract -> enrollment -> student resolution and the
 * same notify-on-commit shape, so it lives here instead of inside
 * any single one of them.
 */

async function notifyInvoiceChanged(
  db,
  connection,
  { invoiceId, invoiceDescription, changeType, previousValue, newValue, studentId, courseId, courseName }
) {
  const recipient = await resolveStudentOwner(connection, { studentId });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.invoice.changed",
    sourceType: "invoice",
    sourceId: invoiceId,
    courseId,
    context: {
      invoiceId,
      invoiceDescription,
      changeType,
      previousValue,
      newValue,
      courseId,
      courseName,
    },
    recipients: [recipient],
    connection,
  });
}

async function notifyInvoiceCancelled(
  db,
  connection,
  { invoiceId, invoiceDescription, reason, studentId, courseId, courseName }
) {
  const recipient = await resolveStudentOwner(connection, { studentId });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.invoice.cancelled",
    sourceType: "invoice",
    sourceId: invoiceId,
    courseId,
    context: { invoiceId, invoiceDescription, reason: reason || null, courseId, courseName },
    recipients: [recipient],
    connection,
  });
}

async function notifyPaymentApproved(
  db,
  connection,
  { paymentId, invoiceId, invoiceDescription, amount, studentId, courseId, courseName }
) {
  const recipient = await resolveStudentOwner(connection, { studentId });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.payment.approved",
    sourceType: "payment",
    sourceId: paymentId,
    courseId,
    context: { paymentId, invoiceId, invoiceDescription, amount, courseId, courseName },
    recipients: [recipient],
    connection,
  });
}

async function notifyPaymentRefunded(
  db,
  connection,
  { paymentId, invoiceId, invoiceDescription, amount, reason, studentId, courseId, courseName }
) {
  const recipient = await resolveStudentOwner(connection, { studentId });

  if (!recipient) {
    return;
  }

  await createNotificationEvent(db, {
    type: "financial.payment.refunded",
    sourceType: "payment",
    sourceId: paymentId,
    courseId,
    context: { paymentId, invoiceId, invoiceDescription, amount, reason: reason || null, courseId, courseName },
    recipients: [recipient],
    connection,
  });
}

module.exports = {
  notifyInvoiceChanged,
  notifyInvoiceCancelled,
  notifyPaymentApproved,
  notifyPaymentRefunded,
};
