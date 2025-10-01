import { ClaimsTable } from '../claims-table';

export default function ClaimsTableExample() {
  const mockClaims = [
    {
      id: "1",
      patientName: "Sarah Johnson",
      invoiceNumber: "INV-2024-001234",
      payorName: "Blue Cross Blue Shield",
      balanceDue: 2450.0,
      invoiceAge: 47,
      status: "in_work" as const,
      slaStatus: "yellow" as const,
      lastAction: "Called payor 2 days ago",
    },
    {
      id: "2",
      patientName: "Michael Chen",
      invoiceNumber: "INV-2024-001235",
      payorName: "UnitedHealthcare",
      balanceDue: 1850.5,
      invoiceAge: 23,
      status: "new" as const,
      slaStatus: "green" as const,
      lastAction: "Assigned today",
    },
  ];

  return (
    <div className="p-6 bg-background">
      <ClaimsTable claims={mockClaims} />
    </div>
  );
}
