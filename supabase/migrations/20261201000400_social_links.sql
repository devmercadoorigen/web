-- Redes oficiales de Mercado Origen (TikTok no cambia).
update public.site_settings
set value = value || jsonb_build_object(
      'instagram', 'https://www.instagram.com/mercadoorigen.col/',
      'facebook',  'https://www.facebook.com/profile.php?id=61594564100205'),
    updated_at = now()
where key = 'contact';
