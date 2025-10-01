import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./status-badge";
import { SlaIndicator } from "./sla-indicator";
import { ArrowUpDown, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Claim {
  id: string;
  patientName: string;
  invoiceNumber: string;
  payorName: string;
  balanceDue: number;
  invoiceAge: number;
  status: any;
  slaStatus: "green" | "yellow" | "red";
  lastAction: string;
}

interface ClaimsTableProps {
  claims: Claim[];
  onViewClaim?: (claimId: string) => void;
}

export function ClaimsTable({ claims, onViewClaim }: ClaimsTableProps) {
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Claim;
    direction: "asc" | "desc";
  } | null>(null);

  const toggleSelectAll = () => {
    if (selectedClaims.size === claims.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(claims.map((c) => c.id)));
    }
  };

  const toggleSelectClaim = (claimId: string) => {
    const newSelected = new Set(selectedClaims);
    if (newSelected.has(claimId)) {
      newSelected.delete(claimId);
    } else {
      newSelected.add(claimId);
    }
    setSelectedClaims(newSelected);
  };

  const handleSort = (key: keyof Claim) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    console.log(`Sorting by ${key}`);
  };

  return (
    <div className="rounded-md border" data-testid="table-claims">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedClaims.size === claims.length}
                onCheckedChange={toggleSelectAll}
                data-testid="checkbox-select-all"
              />
            </TableHead>
            <TableHead className="w-12">SLA</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleSort("invoiceNumber")}
                data-testid="button-sort-invoice"
              >
                Invoice #
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Patient Name</TableHead>
            <TableHead>Payor</TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleSort("balanceDue")}
                data-testid="button-sort-balance"
              >
                Balance Due
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleSort("invoiceAge")}
                data-testid="button-sort-age"
              >
                Age (days)
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Action</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((claim) => (
            <TableRow
              key={claim.id}
              className="hover-elevate"
              data-testid={`row-claim-${claim.id}`}
            >
              <TableCell>
                <Checkbox
                  checked={selectedClaims.has(claim.id)}
                  onCheckedChange={() => toggleSelectClaim(claim.id)}
                  data-testid={`checkbox-claim-${claim.id}`}
                />
              </TableCell>
              <TableCell>
                <SlaIndicator status={claim.slaStatus} />
              </TableCell>
              <TableCell className="font-mono text-sm font-medium">
                {claim.invoiceNumber}
              </TableCell>
              <TableCell>{claim.patientName}</TableCell>
              <TableCell className="text-sm">{claim.payorName}</TableCell>
              <TableCell className="text-right font-mono font-medium">
                ${claim.balanceDue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono">{claim.invoiceAge}</TableCell>
              <TableCell>
                <StatusBadge status={claim.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {claim.lastAction}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-actions-${claim.id}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        console.log(`Viewing claim ${claim.id}`);
                        onViewClaim?.(claim.id);
                      }}
                      data-testid={`menu-view-${claim.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => console.log(`Assigning claim ${claim.id}`)}
                    >
                      Assign to Me
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => console.log(`Updating claim ${claim.id}`)}
                    >
                      Update Status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
