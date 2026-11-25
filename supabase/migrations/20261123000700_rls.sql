-- =====================================================================
-- Mercado Origen · 0700 · Row Level Security
-- Regla general: RLS activo en TODAS las tablas. El admin tiene acceso
-- total vía is_admin(). service_role (Edge Functions) ignora la RLS.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'sku_counters', 'subregions', 'municipalities', 'profiles', 'addresses', 'audit_log',
    'ambassadors', 'ambassador_private', 'ambassador_badges', 'categories', 'ambassador_applications',
    'products', 'product_images', 'product_variants', 'kits', 'kit_items',
    'coupons', 'orders', 'order_items', 'order_status_history', 'coupon_redemptions',
    'payments', 'payment_events', 'ambassador_payouts', 'ambassador_ledger',
    'wishlists', 'reviews', 'product_events', 'newsletter_subscribers',
    'shipping_settings', 'faqs', 'site_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Acceso total del admin en todas las tablas
    execute format('create policy "admin: todo" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Lectura pública: territorio, categorías y contenido
-- ---------------------------------------------------------------------
create policy "publico: leer" on public.subregions       for select to anon, authenticated using (true);
create policy "publico: leer" on public.municipalities   for select to anon, authenticated using (true);
create policy "publico: leer activas" on public.categories for select to anon, authenticated using (is_active);
create policy "publico: leer activas" on public.faqs     for select to anon, authenticated using (is_active);
create policy "publico: leer" on public.site_settings    for select to anon, authenticated using (true);
create policy "publico: leer" on public.shipping_settings for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Perfiles y direcciones: cada quien lo suyo
-- ---------------------------------------------------------------------
create policy "propio: leer"      on public.profiles for select to authenticated using (id = auth.uid());
create policy "propio: actualizar" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());   -- rol y estado los protege el trigger

create policy "propio: todo" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Embajadores
-- ---------------------------------------------------------------------
create policy "publico: activos" on public.ambassadors for select to anon, authenticated
  using (status = 'activo');
create policy "propio: leer" on public.ambassadors for select to authenticated
  using (profile_id = auth.uid());
create policy "propio: editar vitrina" on public.ambassadors for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());   -- campos protegidos por trigger

-- Datos privados: el embajador solo lee los suyos (comisión, datos bancarios). Escribe el admin.
create policy "propio: leer" on public.ambassador_private for select to authenticated
  using (ambassador_id = public.my_ambassador_id());

create policy "publico: de embajadores activos" on public.ambassador_badges for select to anon, authenticated
  using (exists (select 1 from public.ambassadors a where a.id = ambassador_id));   -- hereda la RLS de ambassadors

-- Formulario "Quiero ser embajador": cualquiera envía, solo el admin lee.
create policy "publico: enviar" on public.ambassador_applications for insert to anon, authenticated
  with check (status = 'nueva' and reviewed_by is null and ambassador_id is null and admin_notes is null);

-- ---------------------------------------------------------------------
-- Productos: público ve aprobados de embajadores activos; el embajador
-- gestiona los suyos.
-- ---------------------------------------------------------------------
create policy "publico: aprobados" on public.products for select to anon, authenticated
  using (
    status = 'aprobado'
    and exists (select 1 from public.ambassadors a where a.id = ambassador_id and a.status = 'activo')
  );
create policy "embajador: leer propios" on public.products for select to authenticated
  using (ambassador_id = public.my_ambassador_id());
create policy "embajador: crear" on public.products for insert to authenticated
  with check (
    ambassador_id = public.my_ambassador_id()
    and exists (select 1 from public.ambassadors a where a.id = ambassador_id and a.status = 'activo')
  );
create policy "embajador: editar propios" on public.products for update to authenticated
  using (ambassador_id = public.my_ambassador_id())
  with check (ambassador_id = public.my_ambassador_id());
create policy "embajador: borrar borradores" on public.products for delete to authenticated
  using (ambassador_id = public.my_ambassador_id() and status in ('borrador', 'rechazado') and sales_count = 0);

-- Imágenes y variantes: visibles si el producto es visible para quien consulta
-- (la subconsulta respeta la RLS de products); las edita el dueño.
create policy "publico: de productos visibles" on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "embajador: gestionar" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.ambassador_id = public.my_ambassador_id()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.ambassador_id = public.my_ambassador_id()));

create policy "publico: de productos visibles" on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "embajador: gestionar" on public.product_variants for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.ambassador_id = public.my_ambassador_id()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.ambassador_id = public.my_ambassador_id()));

-- ---------------------------------------------------------------------
-- Kits: públicos si están activos; los gestiona el admin.
-- ---------------------------------------------------------------------
create policy "publico: activos" on public.kits for select to anon, authenticated using (is_active);
create policy "publico: de kits visibles" on public.kit_items for select to anon, authenticated
  using (exists (select 1 from public.kits k where k.id = kit_id));

-- ---------------------------------------------------------------------
-- Pedidos: el cliente lee los suyos. Nadie escribe desde el navegador:
-- create-order y el webhook usan service_role.
-- ---------------------------------------------------------------------
create policy "propio: leer" on public.orders for select to authenticated using (user_id = auth.uid());

create policy "propio: leer" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- El embajador ve sus items (no puede leer orders, así que no ve datos del cliente).
create policy "embajador: sus items" on public.order_items for select to authenticated
  using (ambassador_id = public.my_ambassador_id());

create policy "propio: leer" on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "propio: leer" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
-- payment_events, coupons, coupon_redemptions: solo admin (y service_role).

-- ---------------------------------------------------------------------
-- Liquidaciones: el embajador ve las suyas.
-- ---------------------------------------------------------------------
create policy "embajador: propias" on public.ambassador_payouts for select to authenticated
  using (ambassador_id = public.my_ambassador_id());
create policy "embajador: propias" on public.ambassador_ledger for select to authenticated
  using (ambassador_id = public.my_ambassador_id());

-- ---------------------------------------------------------------------
-- Interacción
-- ---------------------------------------------------------------------
create policy "propio: todo" on public.wishlists for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "publico: visibles" on public.reviews for select to anon, authenticated using (is_visible);
create policy "propio: leer" on public.reviews for select to authenticated using (user_id = auth.uid());
create policy "propio: crear si recibió el producto" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and public.can_review_item(order_item_id));
create policy "propio: editar" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "propio: borrar" on public.reviews for delete to authenticated using (user_id = auth.uid());
create policy "embajador: reseñas propias" on public.reviews for select to authenticated
  using (ambassador_id = public.my_ambassador_id());

-- Eventos: cualquiera registra los suyos (invitado con session_id). Solo el admin los lee.
create policy "publico: registrar" on public.product_events for insert to anon, authenticated
  with check (
    (user_id is null and session_id is not null)
    or (user_id = auth.uid())
  );

-- newsletter_subscribers: solo admin; el alta pública va por subscribe_newsletter().
-- audit_log, sku_counters: solo admin.

-- ---------------------------------------------------------------------
-- Permisos (GRANT). En este proyecto Supabase NO concede permisos por
-- defecto sobre tablas ni funciones nuevas: se declaran aquí, explícitos
-- y mínimos. La RLS de arriba decide además QUÉ filas ve cada quien.
-- ---------------------------------------------------------------------

-- TRUNCATE ignora la RLS: nadie desde la API.
revoke truncate on all tables in schema public from anon, authenticated;

-- Visitante: solo lectura del catálogo y contenido público + dos formularios.
grant select on
  public.subregions, public.municipalities, public.categories, public.faqs,
  public.site_settings, public.shipping_settings,
  public.ambassadors, public.ambassador_badges,
  public.products, public.product_images, public.product_variants,
  public.kits, public.kit_items, public.kit_summaries, public.reviews
to anon;
grant insert on public.ambassador_applications, public.product_events to anon;

-- Usuario con sesión: CRUD sujeto a RLS en todas las tablas.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.kit_summaries to authenticated;

-- Edge Functions (service_role): acceso completo.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Funciones que usan las políticas y los triggers (las evalúa el rol que consulta).
grant execute on function
  public.is_admin(), public.is_privileged(), public.my_ambassador_id(),
  public.can_review_item(uuid), public.f_unaccent(text), public.slugify(text), public.make_initials(text)
to anon, authenticated, service_role;

-- write_audit la usan triggers que corren como el usuario; internamente
-- rechaza a quien no sea admin o service_role.
grant execute on function public.write_audit(text, text, text, jsonb) to authenticated, service_role;

-- RPC públicas
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
grant execute on function public.guest_order(text, uuid) to anon, authenticated;

-- RPC con sesión (cada una valida el rol adentro)
grant execute on function
  public.admin_regenerate_sku(uuid),
  public.admin_set_order_status(uuid, public.order_status, text),
  public.ambassador_order_items(public.order_item_status),
  public.ambassador_mark_ready(uuid),
  public.merge_session_events(text)
to authenticated;

-- service_role puede ejecutar todo (Edge Functions y tareas programadas).
grant execute on all functions in schema public to service_role;

-- Internas: nunca por la API (las llaman funciones security definer).
revoke execute on function public.next_counter(text) from anon, authenticated;
revoke execute on function public.apply_payment_approval(uuid) from anon, authenticated;
