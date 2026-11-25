-- =====================================================================
-- Mercado Origen · 0800 · Storage
--  avatars         público · 2 MB · {user_id}/…  (foto de perfil y banner del embajador)
--  product-images  público · 5 MB · {ambassador_id}/…
--  brand-assets    público · 10 MB · solo admin (zonas, kits, banners del sitio)
-- El frontend comprime a WebP (máx. 1600 px) y genera miniatura antes de subir.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true, 2 * 1024 * 1024,  array['image/webp', 'image/jpeg', 'image/png']),
  ('product-images', 'product-images', true, 5 * 1024 * 1024,  array['image/webp', 'image/jpeg', 'image/png']),
  ('brand-assets',   'brand-assets',   true, 10 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de los tres buckets
create policy "mo: leer imagenes publicas" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars', 'product-images', 'brand-assets'));

-- avatars: cada usuario solo en su carpeta
create policy "mo: avatars propio insertar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mo: avatars propio actualizar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "mo: avatars propio borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- product-images: el embajador en {su ambassador_id}/…
create policy "mo: productos embajador insertar" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_ambassador_id()::text);
create policy "mo: productos embajador actualizar" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_ambassador_id()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_ambassador_id()::text);
create policy "mo: productos embajador borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_ambassador_id()::text);

-- Admin: todo en los tres buckets
create policy "mo: admin todo" on storage.objects for all to authenticated
  using (bucket_id in ('avatars', 'product-images', 'brand-assets') and public.is_admin())
  with check (bucket_id in ('avatars', 'product-images', 'brand-assets') and public.is_admin());
