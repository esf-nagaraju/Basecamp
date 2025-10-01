import { X, Calendar, DollarSign, User, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./status-badge";
import { SlaIndicator } from "./sla-indicator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClaimDetailPanelProps {
  claimId: string;
  onClose: () => void;
}

export function ClaimDetailPanel({ claimId, onClose }: ClaimDetailPanelProps) {
  const claim = {
    id: claimId,
    invoiceNumber: "INV-2024-001234",
    patientName: "Sarah Johnson",
    dob: "1985-03-15",
    customerId: "CUST-98765",
    payorName: "Blue Cross Blue Shield",
    payorCode: "BCBS-001",
    payorType: "Commercial",
    balanceDue: 2450.0,
    listPrice: 3200.0,
    allowedAmount: 2800.0,
    appliedAmount: 350.0,
    invoiceDate: "2024-08-15",
    invoiceAge: 47,
    dateOfService: "2024-08-01",
    hcpcCode: "99213",
    modifiers: ["25", "59"],
    status: "in_work" as const,
    slaStatus: "yellow" as const,
    denialCodes: ["CO-45", "CO-97"],
    lastDenialDate: "2024-09-10",
    notes: [
      {
        id: "1",
        date: "2024-09-28",
        author: "John Smith",
        text: "Called payor, waiting for claim status update",
      },
      {
        id: "2",
        date: "2024-09-25",
        author: "Jane Doe",
        text: "Submitted appeal with additional documentation",
      },
    ],
  };

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-background border-l shadow-xl z-50"
      data-testid="panel-claim-detail"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Claim Details</h2>
            <p className="text-sm text-muted-foreground font-mono">
              {claim.invoiceNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <StatusBadge status={claim.status} />
              <SlaIndicator status={claim.slaStatus} daysRemaining={8} />
              <span className="text-sm text-muted-foreground">
                {claim.invoiceAge} days old
              </span>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" data-testid="tab-details">
                  Details
                </TabsTrigger>
                <TabsTrigger value="financial" data-testid="tab-financial">
                  Financial
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{claim.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DOB:</span>
                      <span className="font-mono">{claim.dob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer ID:</span>
                      <span className="font-mono">{claim.customerId}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Payor Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payor:</span>
                      <span className="font-medium">{claim.payorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-mono">{claim.payorCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="secondary">{claim.payorType}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Service Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date of Service:</span>
                      <span className="font-mono">{claim.dateOfService}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HCPC Code:</span>
                      <span className="font-mono">{claim.hcpcCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modifiers:</span>
                      <div className="flex gap-1">
                        {claim.modifiers.map((mod) => (
                          <Badge key={mod} variant="outline">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">List Price:</span>
                      <span className="font-mono">
                        ${claim.listPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowed Amount:</span>
                      <span className="font-mono">
                        ${claim.allowedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied Amount:</span>
                      <span className="font-mono">
                        ${claim.appliedAmount.toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Balance Due:</span>
                      <span className="font-mono text-primary">
                        ${claim.balanceDue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {claim.denialCodes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-medium mb-3">Denial Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Denial:</span>
                          <span className="font-mono">{claim.lastDenialDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Codes:</span>
                          <div className="flex gap-1">
                            {claim.denialCodes.map((code) => (
                              <Badge key={code} variant="destructive">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {claim.notes.map((note) => (
                    <div key={note.id} className="border rounded-md p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{note.author}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {note.date}
                        </span>
                      </div>
                      <p className="text-sm">{note.text}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="p-6 border-t space-y-2">
          <Button className="w-full" data-testid="button-update-status">
            Update Status
          </Button>
          <Button variant="outline" className="w-full" data-testid="button-add-note">
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
