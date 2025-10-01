import { storage } from "./storage";
import type { InsertClaim } from "@shared/schema";

async function seed() {
  console.log("Starting seed...");
  
  let defaultTenant = await storage.getTenant("default");
  if (!defaultTenant) {
    defaultTenant = await storage.createTenant({
      name: "Acme Healthcare",
      settings: {},
    });
    console.log("Created default tenant:", defaultTenant.id);
  }

  const statuses = ["new", "in_work", "pending_info", "denied", "appeal_pending", "paid"];
  const slaStatuses: ("green" | "yellow" | "red")[] = ["green", "yellow", "red"];
  const payors = [
    "Blue Cross Blue Shield",
    "UnitedHealthcare",
    "Aetna",
    "Cigna",
    "Medicare",
    "Humana",
    "Anthem",
  ];
  const patients = [
    "Sarah Johnson",
    "Michael Chen",
    "Emily Rodriguez",
    "David Williams",
    "Lisa Anderson",
    "James Martinez",
    "Jennifer Taylor",
    "Robert Brown",
    "Maria Garcia",
    "John Smith",
  ];

  const claims: InsertClaim[] = [];
  
  for (let i = 0; i < 25; i++) {
    const invoiceAge = Math.floor(Math.random() * 120);
    const balance = Math.floor(Math.random() * 5000) + 500;
    
    claims.push({
      tenantId: defaultTenant.id!,
      customerName: patients[Math.floor(Math.random() * patients.length)],
      customerId: `CUST-${1000 + i}`,
      dob: `19${50 + Math.floor(Math.random() * 50)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      insuredId: `INS-${10000 + i}`,
      
      payorName: payors[Math.floor(Math.random() * payors.length)],
      payorCode: `PAY-${100 + i}`,
      payorType: Math.random() > 0.5 ? "Commercial" : "Government",
      
      listPrice: (balance * 1.3).toFixed(2),
      allowedAmount: (balance * 1.1).toFixed(2),
      dueAmount: balance.toFixed(2),
      appliedAmount: (Math.floor(Math.random() * 500)).toFixed(2),
      balanceDue: balance.toFixed(2),
      
      invoiceNumber: `INV-2024-${String(1000 + i).padStart(6, "0")}`,
      invoiceDate: new Date(Date.now() - invoiceAge * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      invoiceAge,
      invoiceAgeBucket: invoiceAge < 30 ? "0-30" : invoiceAge < 60 ? "31-60" : invoiceAge < 90 ? "61-90" : "90+",
      
      dateOfService: new Date(Date.now() - (invoiceAge + 5) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      dosAgeBucket: invoiceAge < 30 ? "0-30" : invoiceAge < 60 ? "31-60" : "61-90",
      hcpcCode: ["99213", "99214", "99215", "99205"][Math.floor(Math.random() * 4)],
      mod1: ["25", "59", ""][Math.floor(Math.random() * 3)],
      mod2: Math.random() > 0.7 ? "GT" : "",
      
      auditFlag: Math.random() > 0.8,
      pendingAdjustment: Math.random() > 0.9,
      errorFlag: Math.random() > 0.85,
      invoiceStatus: Math.random() > 0.5 ? "Submitted" : "In Review",
      
      status: statuses[Math.floor(Math.random() * statuses.length)],
      slaStatus: slaStatuses[invoiceAge < 30 ? 0 : invoiceAge < 60 ? 1 : 2],
      
      denialCodes: Math.random() > 0.6 ? ["CO-45", "CO-97"] : [],
      lastDenialDate: Math.random() > 0.6 ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : undefined,
      
      priorityScore: Math.floor((invoiceAge * 0.5) + (balance * 0.01)),
    });
  }

  const created = await storage.bulkCreateClaims(claims);
  console.log(`Created ${created.length} claims`);
  
  console.log("Seed completed!");
}

seed().catch(console.error);
