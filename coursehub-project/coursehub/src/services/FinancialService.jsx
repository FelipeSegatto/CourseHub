import { apiFetch } from "./APIService";

function buildQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const shouldIgnore =
      value === undefined ||
      value === null ||
      value === "";

    if (!shouldIgnore) {
      query.append(key, String(value));
    }
  });

  return query.toString();
}

export async function getFinancialDashboardSummary() {
  return apiFetch(
    "/api/admin/financial/dashboard/summary"
  );
}

export async function listFinancialContracts(params = {}) {
  const queryString = buildQueryString(params);

  const endpoint = queryString
    ? `/api/admin/financial/contracts?${queryString}`
    : "/api/admin/financial/contracts";

  return apiFetch(endpoint);
}

export async function getFinancialContractDetails(contractId) {
  if (!contractId) {
    throw new Error(
      "O identificador do contrato financeiro é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/contracts/${contractId}`
  );
}

export async function getFinancialContractEvents(contractId) {
  if (!contractId) {
    throw new Error(
      "O identificador do contrato financeiro é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/contracts/${contractId}/events`
  );
}

export async function listFinancialInvoices(params = {}) {
  const queryString = buildQueryString(params);

  const endpoint = queryString
    ? `/api/admin/financial/invoices?${queryString}`
    : "/api/admin/financial/invoices";

  return apiFetch(endpoint);
}

export async function getFinancialInvoiceDetails(invoiceId) {
  if (!invoiceId) {
    throw new Error(
      "O identificador da fatura é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/invoices/${invoiceId}`
  );
}

export async function changeInvoiceDueDate(
  invoiceId,
  payload
) {
  if (!invoiceId) {
    throw new Error(
      "O identificador da fatura é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/invoices/${invoiceId}/due-date`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function changeInvoiceAmount(
  invoiceId,
  payload
) {
  if (!invoiceId) {
    throw new Error(
      "O identificador da fatura é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/invoices/${invoiceId}/amount`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function registerManualPayment(
  invoiceId,
  payload
) {
  if (!invoiceId) {
    throw new Error(
      "O identificador da fatura é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/invoices/${invoiceId}/manual-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function cancelInvoice(
  invoiceId,
  payload
) {
  if (!invoiceId) {
    throw new Error(
      "O identificador da fatura é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/invoices/${invoiceId}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function refundPayment(
  paymentId,
  payload
) {
  if (!paymentId) {
    throw new Error(
      "O identificador do pagamento é obrigatório."
    );
  }

  return apiFetch(
    `/api/admin/financial/payments/${paymentId}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
}