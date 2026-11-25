-- =====================================================================
-- Pruebas de RLS, triggers y flujo de pago. Todo corre en una
-- transacción que se revierte al final: no deja datos.
--
--   docker exec -i supabase_db_mercado-origen psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/checks/rls_and_logic.sql
--
-- Cada prueba imprime "OK ·". Si una falla, se detiene con "FALLO ·".
-- =====================================================================
\set QUIET on
begin;

-- Identidades de prueba --------------------------------------------------
-- cliente: el de la semilla. Se crean un embajador (vinculado a EM0004) y un admin.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'embajador@test.local', 'x', now(), '{"full_name":"Embajador Test"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000ad', 'authenticated', 'authenticated', 'admin@test.local', 'x', now(), '{"full_name":"Admin Test"}', now(), now());
update public.profiles set role = 'embajador' where id = '00000000-0000-4000-8000-0000000000e1';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000ad';
update public.ambassadors set profile_id = '00000000-0000-4000-8000-0000000000e1' where code = 'EM0004';

-- Un producto en borrador de otro embajador (EM0003) que el público NO debe ver
insert into public.products (ambassador_id, category_id, name, price, stock, status)
select a.id, c.id, 'Borrador secreto de BRIED', 10000, 5, 'borrador'
from public.ambassadors a, public.categories c where a.code = 'EM0003' and c.code = 'CHO';

\echo '--- Visitante (anon) ---'
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  if (select count(*) from public.products) <> 43 then raise exception 'FALLO · anon debería ver 43 productos aprobados'; end if;
  raise notice 'OK · anon ve solo los 43 productos aprobados (no el borrador)';
  if (select count(*) from public.ambassadors) <> 17 then raise exception 'FALLO · anon debería ver 17 embajadores'; end if;
  -- Tablas privadas: anon ni siquiera tiene permiso de lectura (error, no "0 filas").
  declare t text; n int;
  begin
    foreach t in array array['ambassador_private', 'profiles', 'addresses', 'orders', 'order_items', 'payments',
                             'coupons', 'audit_log', 'newsletter_subscribers', 'ambassador_ledger', 'product_events', 'email_outbox'] loop
      begin
        execute format('select count(*) from public.%I', t) into n;
        if n > 0 then raise exception 'FALLO · anon lee % filas de %', n, t; end if;
      exception when insufficient_privilege then null;
      end;
    end loop;
  end;
  raise notice 'OK · anon no puede leer datos privados, perfiles, pedidos, pagos, cupones, boletín ni auditoría';
  if (select count(*) from public.kit_summaries where is_available) <> 3 then raise exception 'FALLO · kits disponibles'; end if;
  raise notice 'OK · anon ve los 3 kits disponibles con su ahorro calculado';

  insert into public.ambassador_applications (name, email, phone, description, data_policy_accepted_at)
  values ('Productora de prueba', 'p@test.local', '3000000000', 'Hago café en La Plata', now());
  begin
    perform 1 from public.ambassador_applications;
    raise exception 'FALLO · anon lee solicitudes';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK · anon envía "Quiero ser embajador" pero no puede leer las solicitudes';

  begin
    insert into public.products (ambassador_id, category_id, name, price)
    select a.id, c.id, 'Intruso', 1000 from public.ambassadors a, public.categories c limit 1;
    raise exception 'FALLO · anon pudo crear un producto';
  exception when insufficient_privilege then raise notice 'OK · anon no puede crear productos';
  end;

  perform public.subscribe_newsletter('lector@test.local', 'home');
  perform public.subscribe_newsletter('lector@test.local', 'home');   -- repetido: no revela nada
  raise notice 'OK · boletín: suscripción idempotente vía RPC';
end $$;
reset role;

\echo '--- Cliente ---'
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-00000000c11e"}', true);
-- Estado limpio del cliente (otras pruebas pueden haber dejado favoritos o carrito)
delete from public.wishlists where user_id = auth.uid();
delete from public.cart_items where user_id = auth.uid();
do $$
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FALLO · el cliente debe ver solo su perfil'; end if;
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FALLO · el cliente se hizo admin';
  exception when insufficient_privilege then raise notice 'OK · el cliente no puede cambiarse el rol';
  end;
  update public.profiles set full_name = 'Cliente Editado' where id = auth.uid();
  raise notice 'OK · el cliente edita su nombre';

  insert into public.addresses (user_id, recipient, phone, department, city, address_line, is_default)
  values (auth.uid(), 'Cliente', '3001234567', 'Huila', 'Neiva', 'Calle 1 # 2-3', true);
  insert into public.addresses (user_id, recipient, phone, department, city, address_line, is_default)
  values (auth.uid(), 'Oficina', '3001234567', 'Huila', 'Neiva', 'Carrera 5 # 10-20', true);
  if (select count(*) from public.addresses where is_default) <> 1 then raise exception 'FALLO · más de una dirección principal'; end if;
  raise notice 'OK · direcciones: solo una principal';

  begin
    insert into public.orders (email, customer_name, shipping_address) values ('x@x.co', 'X', '{}');
    raise exception 'FALLO · el cliente creó un pedido directamente';
  exception when insufficient_privilege then raise notice 'OK · el cliente no puede crear pedidos (solo la Edge Function)';
  end;

  insert into public.wishlists (user_id, product_id) select auth.uid(), id from public.products where sku = 'TIP-EM0007-00001';
  if (select price_at_add from public.wishlists limit 1) <> 10000 then raise exception 'FALLO · precio guardado en deseos'; end if;
  raise notice 'OK · lista de deseos guarda el precio para avisar si baja';
end $$;
reset role;

\echo '--- Embajador (Chocolate Mamá Susana, EM0004) ---'
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000e1"}', true);
do $$
declare v_sku text; v_status public.product_status; v_rows int;
begin
  insert into public.products (ambassador_id, category_id, name, price, stock, status, sku, is_featured)
  select public.my_ambassador_id(), c.id, 'Chocolate de mesa con canela 500 g', 42000, 10, 'aprobado', 'HACK-1', true
  from public.categories c where c.code = 'CHO'
  returning sku, status into v_sku, v_status;
  if v_sku <> 'CHO-EM0004-00005' then raise exception 'FALLO · SKU generado: %', v_sku; end if;
  if v_status <> 'pendiente' then raise exception 'FALLO · el embajador se autoaprobó'; end if;
  raise notice 'OK · producto nuevo: SKU % generado por la base y estado "pendiente" (ignoró aprobado/destacado)', v_sku;

  begin
    update public.products set sku = 'CHO-EM0004-99999' where sku = v_sku;
    raise exception 'FALLO · el embajador cambió el SKU';
  exception when insufficient_privilege then raise notice 'OK · el SKU es inmutable para el embajador';
  end;

  begin
    update public.products set status = 'aprobado' where sku = v_sku;
    raise exception 'FALLO · el embajador aprobó su producto';
  exception when insufficient_privilege then raise notice 'OK · el embajador no puede aprobar';
  end;

  update public.products set price = 82000 where sku = 'CHO-EM0004-00001';
  select status into v_status from public.products where sku = 'CHO-EM0004-00001';
  if v_status <> 'pendiente' then raise exception 'FALLO · cambio de precio no volvió a revisión'; end if;
  raise notice 'OK · cambiar el precio de un producto aprobado lo devuelve a "pendiente"';

  update public.products set price = 1 where sku = 'CHO-EM0003-00001';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then raise exception 'FALLO · editó un producto ajeno'; end if;
  if exists (select 1 from public.products where name = 'Borrador secreto de BRIED') then raise exception 'FALLO · ve borradores ajenos'; end if;
  raise notice 'OK · no edita ni ve borradores de otros embajadores';

  if (select count(*) from public.ambassador_private) <> 1 then raise exception 'FALLO · datos privados ajenos visibles'; end if;
  raise notice 'OK · ve solo sus propios datos privados (comisión/banco)';

  update public.ambassadors set short_description = 'Nueva descripción' where id = public.my_ambassador_id();
  begin
    update public.ambassadors set municipality_id = (select id from public.municipalities where name = 'Neiva') where id = public.my_ambassador_id();
    raise exception 'FALLO · cambió su municipio';
  exception when insufficient_privilege then raise notice 'OK · edita su vitrina pero no su municipio';
  end;

  if (select count(*) from public.orders) <> 0 then raise exception 'FALLO · el embajador ve pedidos'; end if;
  raise notice 'OK · el embajador no ve la tabla de pedidos (datos del cliente)';
end $$;
reset role;

\echo '--- Admin ---'
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000ad"}', true);
do $$
declare v_at timestamptz;
begin
  update public.products set status = 'aprobado' where sku = 'CHO-EM0004-00001' returning approved_at into v_at;
  if v_at is null then raise exception 'FALLO · approved_at'; end if;
  raise notice 'OK · el admin aprueba (approved_at y approved_by quedan registrados)';
  begin
    update public.products set status = 'rechazado' where sku = 'CHO-EM0004-00005';
    raise exception 'FALLO · rechazo sin motivo';
  exception when check_violation then raise notice 'OK · rechazar exige motivo';
  end;
  update public.products set status = 'rechazado', rejection_reason = 'Falta la foto del empaque' where sku = 'CHO-EM0004-00005';
  if (select count(*) from public.ambassador_private) <> 17 then raise exception 'FALLO · admin ve datos privados'; end if;
  if not exists (select 1 from public.audit_log where entity = 'products' and actor_id = auth.uid()) then raise exception 'FALLO · auditoría'; end if;
  raise notice 'OK · el admin ve todo y sus acciones quedan en audit_log';
  update public.ambassador_private set commission_rate = 15 where ambassador_id = (select id from public.ambassadors where code = 'EM0001');
  update public.ambassador_private set id_number = id_number || '0', bank_info = '{"cuenta":"SECRETO-123"}'
  where ambassador_id = (select id from public.ambassadors where code = 'EM0001');
  if exists (select 1 from public.audit_log a, public.ambassador_private p
             where a.entity = 'ambassador_private' and p.ambassador_id = (select id from public.ambassadors where code = 'EM0001')
               and (a.payload::text like '%' || p.id_number || '%' or a.payload::text like '%SECRETO-123%')) then
    raise exception 'FALLO · la auditoría guardó la cédula';
  end if;
  raise notice 'OK · la auditoría no guarda datos bancarios ni de identificación';
end $$;
reset role;

\echo '--- Flujo de pago (como lo hará la Edge Function con service_role) ---'
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $$
declare
  v_order uuid; v_stock_before int; v_stock_after int; v_num text; v_hist int; v_ledger int; v_net int;
begin
  select stock into v_stock_before from public.products where sku = 'TIP-EM0007-00001';
  insert into public.orders (user_id, email, customer_name, shipping_address, subtotal, total)
  values ('00000000-0000-4000-8000-00000000c11e', 'cliente@mercadoorigen.test', 'Cliente', '{"city":"Bogotá"}', 38000, 38000)
  returning id, order_number into v_order, v_num;
  if v_num !~ '^MO-\d{4}-\d{6}$' then raise exception 'FALLO · número de pedido %', v_num; end if;
  insert into public.order_items (order_id, product_id, ambassador_id, sku, name, unit_price, quantity)
  select v_order, p.id, p.ambassador_id, p.sku, p.name, p.price, 2 from public.products p where p.sku = 'TIP-EM0007-00001';
  insert into public.payments (order_id, reference, amount_in_cents) values (v_order, 'MO-TEST-1', 3800000);

  update public.payments set status = 'APPROVED' where reference = 'MO-TEST-1';
  update public.payments set status = 'APPROVED', status_message = 'duplicado' where reference = 'MO-TEST-1';  -- evento repetido

  select stock into v_stock_after from public.products where sku = 'TIP-EM0007-00001';
  if v_stock_after <> v_stock_before - 2 then raise exception 'FALLO · stock % -> %', v_stock_before, v_stock_after; end if;
  if (select status from public.orders where id = v_order) <> 'pagado' then raise exception 'FALLO · pedido no quedó pagado'; end if;
  select count(*) into v_hist from public.order_status_history where order_id = v_order;
  if v_hist <> 2 then raise exception 'FALLO · historial tiene % filas', v_hist; end if;
  select count(*), max(net) into v_ledger, v_net from public.ambassador_ledger where order_id = v_order;
  if v_ledger <> 1 or v_net <> 38000 - round(38000 * 0.15) then raise exception 'FALLO · cuenta del embajador (%, %)', v_ledger, v_net; end if;
  raise notice 'OK · pago aprobado: pedido % pagado, stock -2 (una sola vez aunque el evento llegue repetido), historial y liquidación (15%% → neto %)', v_num, v_net;

  perform set_config('app.status_note', 'Cliente pidió cancelar', true);
  update public.orders set status = 'cancelado' where id = v_order;
  select stock into v_stock_after from public.products where sku = 'TIP-EM0007-00001';
  if v_stock_after <> v_stock_before then raise exception 'FALLO · stock no se devolvió'; end if;
  if exists (select 1 from public.ambassador_ledger where order_id = v_order) then raise exception 'FALLO · liquidación no se anuló'; end if;
  if (select note from public.order_status_history where order_id = v_order and status = 'cancelado') <> 'Cliente pidió cancelar' then
    raise exception 'FALLO · nota del historial';
  end if;
  raise notice 'OK · cancelar devuelve el stock, anula la liquidación y guarda la nota en el historial';

  -- Sobreventa: piden más de lo que hay
  insert into public.orders (email, customer_name, shipping_address) values ('invitado@test.local', 'Invitado', '{}') returning id into v_order;
  insert into public.order_items (order_id, product_id, ambassador_id, sku, name, unit_price, quantity)
  select v_order, p.id, p.ambassador_id, p.sku, p.name, p.price, 999 from public.products p where p.sku = 'MIE-EM0006-00002';
  insert into public.payments (order_id, reference, amount_in_cents, status) values (v_order, 'MO-TEST-2', 100, 'APPROVED');
  if not (select needs_review from public.orders where id = v_order) then raise exception 'FALLO · sobreventa no marcada'; end if;
  if (select stock from public.products where sku = 'MIE-EM0006-00002') < 0 then raise exception 'FALLO · stock negativo'; end if;
  raise notice 'OK · sobreventa: el pedido queda "pagado" + marcado para revisión, el stock nunca baja de 0';
end $$;
reset role;

\echo '--- Reseñas ---'
do $$
declare v_item uuid; v_order uuid;
begin
  insert into public.orders (user_id, email, customer_name, shipping_address, status)
  values ('00000000-0000-4000-8000-00000000c11e', 'cliente@mercadoorigen.test', 'Cliente', '{}', 'entregado') returning id into v_order;
  insert into public.order_items (order_id, product_id, ambassador_id, sku, name, unit_price, quantity)
  select v_order, p.id, p.ambassador_id, p.sku, p.name, p.price, 1 from public.products p where p.sku = 'MIE-EM0006-00002'
  returning id into v_item;
  perform set_config('test.item', v_item::text, true);
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-00000000c11e"}', true);
do $$
begin
  insert into public.reviews (order_item_id, user_id, rating, comment, product_id, ambassador_id)
  select current_setting('test.item')::uuid, auth.uid(), 5, 'Deliciosa',
         (select id from public.products limit 1), (select id from public.ambassadors limit 1);   -- se ignoran: salen del item
  if (select rating_avg from public.products where sku = 'MIE-EM0006-00002') <> 5 then raise exception 'FALLO · promedio del producto'; end if;
  if (select rating_count from public.ambassadors where code = 'EM0006') <> 1 then raise exception 'FALLO · conteo del embajador'; end if;
  raise notice 'OK · reseña de un producto recibido: promedios de producto y embajador actualizados';
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000e1"}', true);
do $$
begin
  begin
    insert into public.reviews (order_item_id, user_id, rating) values (current_setting('test.item')::uuid, auth.uid(), 1);
    raise exception 'FALLO · reseña sin haber comprado';
  exception when insufficient_privilege then raise notice 'OK · no se puede reseñar lo que no se recibió';
  end;
end $$;
reset role;

\echo '--- Carrito persistente y +18 ---'
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-00000000c11e"}', true);
do $$
declare v_p uuid; v_k uuid; v_qty int;
begin
  select id into v_p from public.products where sku = 'TIP-EM0007-00001';
  select id into v_k from public.kits where sku = 'KIT-00002';
  perform public.merge_cart(jsonb_build_array(jsonb_build_object('product_id', v_p, 'quantity', 2), jsonb_build_object('kit_id', v_k, 'quantity', 1)));
  perform public.merge_cart(jsonb_build_array(jsonb_build_object('product_id', v_p, 'quantity', 1)));   -- segundo login
  select quantity into v_qty from public.cart_items where product_id = v_p;
  if v_qty <> 2 or (select count(*) from public.cart_items) <> 2 then raise exception 'FALLO · fusión del carrito (%)', v_qty; end if;
  raise notice 'OK · el carrito del invitado se fusiona sin duplicar unidades';
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform 1 from public.cart_items;
    raise exception 'FALLO · anon lee carritos';
  exception when insufficient_privilege then raise notice 'OK · nadie más ve el carrito guardado';
  end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-0000000000e1"}', true);
do $$
begin
  update public.products set is_age_restricted = true where sku = 'CHO-EM0004-00005';
  begin
    update public.products set is_age_restricted = false where sku = 'CHO-EM0004-00005';
    raise exception 'FALLO · el embajador quitó el +18';
  exception when insufficient_privilege then raise notice 'OK · el embajador marca +18 pero solo el admin lo quita';
  end;
end $$;
reset role;

\echo '--- Recomendaciones ---'
-- Recomendaciones ----------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare r jsonb; n int;
begin
  begin
    insert into public.product_events (session_id, product_id, event)
    select 'chk-session-0001', id, 'purchase' from public.products limit 1;
    raise exception 'FALLO · anon inserta eventos directo en la tabla';
  exception when insufficient_privilege then null;
  end;
  n := public.track_product_events('chk-session-0001', (select jsonb_agg(jsonb_build_object('product_id', id, 'event', 'purchase')) from public.products));
  if n <> 0 then raise exception 'FALLO · el navegador registró compras (%)', n; end if;
  raise notice 'OK · los eventos solo entran por track_product_events y la compra solo la registra el servidor';

  n := public.track_product_events('chk-session-0001', (select jsonb_agg(jsonb_build_object('product_id', p.id, 'event', 'cart'))
         from public.products p join public.categories c on c.id = p.category_id where c.slug = 'chocolate-y-cacao'));
  if n < 1 then raise exception 'FALLO · no se registró el carrito'; end if;
  if public.track_product_events('chk-session-0001', (select jsonb_agg(jsonb_build_object('product_id', p.id, 'event', 'cart'))
       from public.products p join public.categories c on c.id = p.category_id where c.slug = 'chocolate-y-cacao')) <> 0 then
    raise exception 'FALLO · eventos duplicados en 30 minutos';
  end if;
  raise notice 'OK · el mismo evento del mismo producto cuenta una vez cada 30 minutos';

  r := public.get_recommendations(null, 'chk-session-0001', 6);
  if not (r ->> 'personalized')::boolean then raise exception 'FALLO · no personaliza con señales'; end if;
  if (r -> 'items' -> 0 -> 'category' ->> 'slug') <> 'chocolate-y-cacao' then raise exception 'FALLO · la afinidad no pesa (% primero)', r -> 'items' -> 0 ->> 'name'; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'items') i where (i ->> 'stock')::int <= 0) then raise exception 'FALLO · recomienda agotados'; end if;
  raise notice 'OK · get_recommendations personaliza por afinidad y no recomienda agotados';

  r := public.get_recommendations(null, 'chk-session-nueva', 6);
  if (r ->> 'personalized')::boolean or jsonb_array_length(r -> 'items') = 0 or jsonb_array_length(r -> 'kits') = 0 then
    raise exception 'FALLO · arranque en frío';
  end if;
  raise notice 'OK · un visitante nuevo recibe arranque en frío (FICCA, más vendidos, nuevos) y kits';

  begin
    perform public.get_recommendations('00000000-0000-4000-8000-00000000c11e', null, 3);
    raise exception 'FALLO · anon pidió las recomendaciones de otra persona';
  exception when insufficient_privilege then raise notice 'OK · nadie puede pedir las recomendaciones de otro usuario';
  end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-00000000c11e"}', true);
do $$
declare r jsonb;
begin
  r := public.get_recommendations(null, null, 24);
  if exists (
    select 1 from jsonb_array_elements(r -> 'items') i
    join public.products p on p.id = (i ->> 'id')::uuid
    join public.categories c on c.id = p.category_id and not c.is_consumable
    join public.order_items oi on oi.product_id = p.id
    join public.orders o on o.id = oi.order_id and o.user_id = auth.uid() and o.status in ('pagado', 'preparando', 'consolidado', 'enviado', 'entregado')
  ) then raise exception 'FALLO · recomienda un no consumible ya comprado'; end if;
  r := public.get_recommendations(null, null, 4, jsonb_build_object('product_id', (select id from public.products where sku = 'CHO-EM0004-00001')));
  if exists (select 1 from jsonb_array_elements(r -> 'items') i where i ->> 'sku' = 'CHO-EM0004-00001') then
    raise exception 'FALLO · el producto se recomienda a sí mismo';
  end if;
  raise notice 'OK · no repite compras no consumibles y "Relacionados" excluye el producto actual';
end $$;
reset role;

\echo '--- Todas las pruebas pasaron ---'
rollback;
