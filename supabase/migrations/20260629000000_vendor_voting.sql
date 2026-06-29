-- Add voter_ids column to finance.vendor_quotation
ALTER TABLE finance.vendor_quotation 
ADD COLUMN IF NOT EXISTS voter_ids JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Enable RLS policies (re-verifying)
ALTER TABLE finance.vendor_quotation ENABLE ROW LEVEL SECURITY;

-- Allow select and modify for authenticated users
CREATE POLICY IF NOT EXISTS select_quotations_vote ON finance.vendor_quotation
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS modify_quotations_vote ON finance.vendor_quotation
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
