# Supabase Setup

## 1. Create the `empleados` table

Run this SQL in the Supabase SQL editor:

```sql
CREATE TABLE empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_ingreso DATE NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2. Enable Row Level Security

```sql
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

-- Public read (for display page)
CREATE POLICY "Public read" ON empleados
  FOR SELECT USING (true);

-- Authenticated write
CREATE POLICY "Auth insert" ON empleados
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update" ON empleados
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth delete" ON empleados
  FOR DELETE USING (auth.role() = 'authenticated');
```

## 3. Create Storage bucket

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `fotos-empleados`
3. Set it to **public**
4. Add a policy for authenticated uploads:

```sql
CREATE POLICY "Auth upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fotos-empleados' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth overwrite" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fotos-empleados' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-empleados');
```

## 4. Create admin user

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add user" > "Create new user"
3. Enter the admin email and password
4. This is the only user needed for the system

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings > API (keep secret)
