CREATE TABLE IF NOT EXISTS ticker_mensajes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto      TEXT NOT NULL,
  orden      INTEGER NOT NULL DEFAULT 0,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ticker_mensajes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ticker_mensajes' AND policyname = 'public read'
  ) THEN
    CREATE POLICY "public read" ON ticker_mensajes FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO ticker_mensajes (texto, orden, activo)
SELECT 'Bienvenidos al Departamento de Innovación y Desarrollo Tecnológico del IMSS', 0, true
WHERE NOT EXISTS (SELECT 1 FROM ticker_mensajes);
