import { storage } from "./storage";
import type { Claim } from "@shared/schema";

function calculatePriorityScore(claim: Claim): number {
  let score = 0;
  
  const age = claim.invoiceAge || 0;
  const balance = parseFloat(claim.balanceDue as string) || 0;
  
  score += age * 1.5;
  score += balance * 0.02;
  
  if (claim.denialCodes && Array.isArray(claim.denialCodes) && claim.denialCodes.length > 0) {
    score += 50;
  }
  
  if (claim.payorType === "Government") {
    score += 20;
  }
  
  if (age > 90) {
    score += 100;
  } else if (age > 60) {
    score += 50;
  } else if (age > 30) {
    score += 25;
  }
  
  if (balance > 5000) {
    score += 50;
  } else if (balance > 2000) {
    score += 25;
  }
  
  return Math.floor(score);
}

export async function updateClaimPriorities(tenantId: string): Promise<number> {
  const claims = await storage.getClaims(tenantId, { limit: 1000 });
  let updated = 0;
  
  for (const claim of claims) {
    const newScore = calculatePriorityScore(claim);
    if (newScore !== claim.priorityScore) {
      await storage.updateClaim(claim.id!, tenantId, { priorityScore: newScore });
      updated++;
    }
  }
  
  return updated;
}

export async function autoGenerateTasks(tenantId: string): Promise<number> {
  const claims = await storage.getClaims(tenantId, { 
    status: ["new", "in_work", "pending_info", "denied"],
    limit: 100 
  });
  
  let created = 0;
  
  for (const claim of claims) {
    const existingTasks = await storage.getTasks(tenantId, { 
      claimId: claim.id!,
      status: "pending"
    });
    
    if (existingTasks.length > 0) {
      continue;
    }
    
    let taskTitle = "";
    let taskPriority: "low" | "medium" | "high" = "medium";
    let shouldCreate = false;
    
    const age = claim.invoiceAge || 0;
    const hasDenials = claim.denialCodes && Array.isArray(claim.denialCodes) && claim.denialCodes.length > 0;
    
    if (claim.status === "new") {
      taskTitle = "Initial claim review and payor contact";
      shouldCreate = true;
      taskPriority = age > 30 ? "high" : "medium";
    } else if (claim.status === "denied" && hasDenials) {
      taskTitle = "Review denial codes and prepare appeal";
      shouldCreate = true;
      taskPriority = "high";
    } else if (age > 60 && claim.status === "in_work") {
      taskTitle = "Follow up on aging claim";
      shouldCreate = true;
      taskPriority = age > 90 ? "high" : "medium";
    } else if (claim.status === "pending_info" && age > 14) {
      taskTitle = "Obtain missing information from provider";
      shouldCreate = true;
      taskPriority = age > 30 ? "high" : "medium";
    }
    
    if (shouldCreate) {
      try {
        await storage.createTask({
          tenantId,
          claimId: claim.id!,
          title: taskTitle,
          description: `Auto-generated task for claim ${claim.invoiceNumber}`,
          priority: taskPriority,
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        created++;
      } catch (error) {
        console.error(`Error creating task for claim ${claim.id}:`, error);
      }
    }
  }
  
  return created;
}

export async function updateSLAStatus(tenantId: string): Promise<number> {
  const claims = await storage.getClaims(tenantId, { limit: 1000 });
  let updated = 0;
  
  for (const claim of claims) {
    const age = claim.invoiceAge || 0;
    let newSlaStatus: "green" | "yellow" | "red" = "green";
    
    if (age > 60) {
      newSlaStatus = "red";
    } else if (age > 30) {
      newSlaStatus = "yellow";
    }
    
    if (newSlaStatus !== claim.slaStatus) {
      await storage.updateClaim(claim.id!, tenantId, { slaStatus: newSlaStatus });
      updated++;
    }
  }
  
  return updated;
}
