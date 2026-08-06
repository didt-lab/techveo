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

## 4. Create the `tech_noticias` table (TechNdencias module)

```sql
CREATE TABLE tech_noticias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT NOT NULL,
  parrafo     TEXT NOT NULL,
  media_url   TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK (media_type IN ('imagen', 'video')),
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tech_noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON tech_noticias FOR SELECT USING (true);
```

Create a Storage bucket called `techndencias-media`:
1. Go to Storage in the Supabase dashboard.
2. Create a new bucket named `techndencias-media`, set it to **public**.
3. Set file size limit to 20MB and allowed mime types to `image/jpeg, image/png, image/webp, video/mp4, video/webm`.

## 5. Create admin user

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add user" > "Create new user"
3. Enter the admin email and password
4. This is the only user needed for the system

## 6. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings > API (keep secret)
