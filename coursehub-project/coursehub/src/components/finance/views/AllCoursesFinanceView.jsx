import ContractSection from "../ContractSection";
import FeaturedInvoiceCard from "../FeaturedInvoiceCard";
import FinanceSummaryCards from "../FinanceSummaryCards";

export default function AllCoursesFinanceView({
  summary,
  overdueInvoice,
  nextInvoice,
  contracts = [],
  onPaymentApproved,
}) {
  const featuredInvoice =
    overdueInvoice || nextInvoice || null;

  return (
    <div className="space-y-6">
      <FinanceSummaryCards summary={summary} />

      {featuredInvoice && (
        <FeaturedInvoiceCard invoice={featuredInvoice} onPaymentApproved={onPaymentApproved} />
      )}

      <ContractSection contracts={contracts} />
    </div>
  );
}