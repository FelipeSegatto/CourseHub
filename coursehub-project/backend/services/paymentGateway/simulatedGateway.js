const crypto = require("crypto");

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateForMySQL(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function formatOnlyDateForMySQL(date) {
  return date.toISOString().slice(0, 10);
}

function createSimulatedPix({ invoiceId, amount }) {
  const gatewayPaymentId = `sim_pix_${crypto.randomUUID()}`;
  const expiresAt = addMinutes(new Date(), 30);

  return {
    gateway: "simulated",
    gatewayPaymentId,
    paymentMethod: "pix",
    amount,
    status: "pending",

    cardInstallments: null,
    cardBrand: null,
    cardLastFour: null,

    pixCopyPaste: [
      "000201",
      "COURSEHUB",
      gatewayPaymentId,
      `INVOICE-${invoiceId}`,
      Number(amount).toFixed(2),
    ].join("|"),

    // Nesta versão simulada, não é um QR Code real.
    // É apenas um identificador para o frontend.
    pixQrCode: `SIMULATED_PIX_QR:${gatewayPaymentId}`,

    pixExpiresAt: formatDateForMySQL(expiresAt),

    boletoBarcode: null,
    boletoUrl: null,
    boletoDueDate: null,

    paidAt: null,
  };
}

function createSimulatedBoleto({ invoiceId, amount }) {
  const gatewayPaymentId = `sim_boleto_${crypto.randomUUID()}`;
  const boletoDueDate = addDays(new Date(), 3);

  const numericId = Date.now().toString().slice(-10);

  return {
    gateway: "simulated",
    gatewayPaymentId,
    paymentMethod: "boleto",
    amount,
    status: "pending",

    cardInstallments: null,
    cardBrand: null,
    cardLastFour: null,

    pixCopyPaste: null,
    pixQrCode: null,
    pixExpiresAt: null,

    boletoBarcode:
      `00190.00009 01234.567890 12345.678901 1 ${numericId}`,

    boletoUrl:
      `/api/student/finance/payments/${gatewayPaymentId}/simulated-boleto`,

    boletoDueDate: formatOnlyDateForMySQL(boletoDueDate),

    paidAt: null,

    invoiceId,
  };
}

function createSimulatedCreditCard({
  amount,
  cardInstallments = 1,
  cardBrand = "visa",
  cardLastFour = "4242",
}) {
  const gatewayPaymentId = `sim_card_${crypto.randomUUID()}`;

  return {
    gateway: "simulated",
    gatewayPaymentId,
    paymentMethod: "credit_card",
    amount,

    // No MVP simulado, o cartão é aprovado imediatamente.
    status: "approved",

    cardInstallments,
    cardBrand,
    cardLastFour,

    pixCopyPaste: null,
    pixQrCode: null,
    pixExpiresAt: null,

    boletoBarcode: null,
    boletoUrl: null,
    boletoDueDate: null,

    paidAt: formatDateForMySQL(new Date()),
  };
}

function createSimulatedPayment({
  invoiceId,
  amount,
  paymentMethod,
  cardInstallments,
  cardBrand,
  cardLastFour,
}) {
  switch (paymentMethod) {
    case "pix":
      return createSimulatedPix({
        invoiceId,
        amount,
      });

    case "boleto":
      return createSimulatedBoleto({
        invoiceId,
        amount,
      });

    case "credit_card":
      return createSimulatedCreditCard({
        amount,
        cardInstallments,
        cardBrand,
        cardLastFour,
      });

    default:
      throw new Error(
        "Forma de pagamento não suportada pelo gateway simulado."
      );
  }
}

module.exports = {
  createSimulatedPayment,
};