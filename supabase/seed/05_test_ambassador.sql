-- =====================================================================
-- Semilla 05 · Embajador de PRUEBA (solo local)
-- embajador@mercadoorigen.test / Embajador123*  ->  Chocolate Mamá Susana (EM0004)
-- En producción, cada embajador recibe una invitación desde /admin (Fase 5).
-- =====================================================================
do $$
declare uid uuid := '00000000-0000-4000-8000-0000000e0004';
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'embajador@mercadoorigen.test',
    extensions.crypt('Embajador123*', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Embajador de Prueba","data_policy_accepted":true}',
    now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'embajador@mercadoorigen.test', 'email_verified', true),
    'email', now(), now(), now());
  update public.profiles set role = 'embajador' where id = uid;
  update public.ambassadors set profile_id = uid where code = 'EM0004';
end $$;
