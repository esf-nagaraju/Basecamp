ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
CREATE INDEX "claims_priority_idx" ON "claims" USING btree ("tenant_id","priority_score","invoice_age");--> statement-breakpoint
CREATE INDEX "claims_balance_idx" ON "claims" USING btree ("tenant_id","balance_due");--> statement-breakpoint
CREATE INDEX "claims_invoice_num_idx" ON "claims" USING btree ("tenant_id","invoice_number");--> statement-breakpoint
CREATE INDEX "claims_payor_name_idx" ON "claims" USING btree ("tenant_id","payor_name");--> statement-breakpoint
CREATE INDEX "claims_customer_name_idx" ON "claims" USING btree ("tenant_id","customer_name");--> statement-breakpoint
CREATE INDEX "users_tenant_username_unique" ON "users" USING btree ("tenant_id","username");