CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  service TEXT NOT NULL,
  address TEXT NOT NULL,
  town TEXT NOT NULL,
  tree_count TEXT NOT NULL,
  urgency TEXT NOT NULL,
  access TEXT,
  concerns_json TEXT NOT NULL DEFAULT '[]',
  details TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  call_time TEXT,
  contact_method TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'failed')),
  email_error TEXT,
  email_sent_at TEXT,
  source_host TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at
  ON quote_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_requests_email_status
  ON quote_requests(email_status, created_at DESC);
