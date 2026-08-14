/**
 * Cancelamento de um financial_contract. Regras da Seção 23:
 * - contrato cancelado antes do pagamento nunca gera matrícula (basta
 *   nunca chamar activateContractFromPaidInvoice depois -- um
 *   contrato cancelled já é bloqueado por ela mesma, ver
 *   activateContractService.js);
 * - nunca apaga histórico financeiro (fatura de ativação em aberto é
 *   cancelada junto, nunca deletada);
 * - um contrato já ativo com matrícula criada também pode ser
 *   cancelado (ex: desistência), mas isso NUNCA apaga a matrícula
 *   automaticamente -- fica para revisão administrativa manual (ver
 *   pendência documentada no relatório final), evita a exclusão
 *   silenciosa de acesso a um aluno que já está estudando.
 */
const { createFinancialEvent } = require("./financialEventService");

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

async function cancelFinancialContract(db, contractId, { reason, actorUserId }) {
  const normalizedContractId = Number(contractId);

  if (!Number.isInteger(normalizedContractId) || normalizedContractId <= 0) {
    throw createServiceError("ID do contrato inválido.", 400);
  }

  if (!actorUserId) {
    throw createServiceError("Administrador responsável é obrigatório.", 401);
  }

  const connection = await db.promise().getConnection();

  try {
    await connection.beginTransaction();

    const [contractRows] = await connection.query(
      `SELECT id, status, activation_invoice_id, enrollment_id FROM financial_contracts WHERE id = ? LIMIT 1 FOR UPDATE`,
      [normalizedContractId]
    );

    if (contractRows.length === 0) {
      throw createServiceError("Contrato não encontrado.", 404);
    }

    const contract = contractRows[0];

    if (contract.status === "cancelled") {
      throw createServiceError("Este contrato já está cancelado.", 409);
    }

    if (contract.status === "completed") {
      throw createServiceError("Um contrato concluído não pode ser cancelado.", 409);
    }

    await connection.query(
      `UPDATE financial_contracts SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [normalizedContractId]
    );

    // A fatura de ativação ainda aberta é cancelada junto -- nunca
    // fica "pending" órfã depois que o contrato que a gerou não
    // existe mais comercialmente. Faturas já pagas/canceladas/
    // reembolsadas não são tocadas.
    if (contract.activation_invoice_id) {
      await connection.query(
        `UPDATE invoices SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = ? AND status IN ('pending', 'processing', 'overdue')`,
        [contract.activation_invoice_id]
      );
    }

    await createFinancialEvent(connection, {
      financialContractId: normalizedContractId,
      enrollmentId: contract.enrollment_id,
      eventType: "contract_cancelled",
      source: "admin",
      actorUserId,
      previousValue: { status: contract.status },
      newValue: { status: "cancelled" },
      reason: reason?.trim() || null,
    });

    await connection.commit();

    return { contractId: normalizedContractId, status: "cancelled" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createServiceError,
  cancelFinancialContract,
};
