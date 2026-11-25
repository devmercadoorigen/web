-- =====================================================================
-- Semilla 04 · Pedidos de DEMOSTRACIÓN del cliente de prueba (solo local)
-- para probar "Mis pedidos": uno entregado y uno en camino con un kit.
-- Pasan por el mismo flujo real: pago APPROVED -> stock, ventas, liquidación.
-- =====================================================================
do $$
declare
  uid constant uuid := '00000000-0000-4000-8000-00000000c11e';
  addr constant jsonb := '{"recipient":"Cliente de Prueba","phone":"3001234567","department":"Bogotá D.C.","city":"Bogotá","address_line":"Calle 93 # 11-26, apto 502","notes":"Portería 24 horas"}';
  o1 uuid; o2 uuid; v_kit uuid;
  p_susana uuid; p_achiras uuid; p_bried uuid; p_shalena uuid; p_miel uuid;
begin
  select id into p_susana  from public.products where supplier_code = 'EM0004_3';
  select id into p_bried   from public.products where supplier_code = 'EM0003_2';
  select id into p_shalena from public.products where supplier_code = 'EM0009_2';
  select id into p_achiras from public.products where supplier_code = 'EM0007_1';
  select id into p_miel    from public.products where supplier_code = 'EM0006_2';
  select id into v_kit from public.kits where sku = 'KIT-00001';

  -- Pedido 1: entregado (dos embajadores, envío gratis)
  insert into public.orders (user_id, email, customer_name, customer_phone, shipping_address, subtotal, shipping, total, carrier, tracking_code, estimated_delivery, created_at)
  values (uid, 'cliente@mercadoorigen.test', 'Cliente de Prueba', '3001234567', addr, 155000, 0, 155000,
          'Servientrega', 'SV2041887355', current_date - 9, now() - interval '14 days')
  returning id into o1;
  insert into public.order_items (order_id, product_id, ambassador_id, sku, name, unit_price, quantity)
  select o1, p.id, p.ambassador_id, p.sku, p.name, p.price, q.qty
  from (values (p_susana, 1), (p_achiras, 4)) q(pid, qty) join public.products p on p.id = q.pid;
  insert into public.payments (order_id, reference, amount_in_cents, status, payment_method_type)
  values (o1, 'DEMO-' || left(o1::text, 8), 15500000, 'APPROVED', 'PSE');

  perform set_config('app.status_note', 'Los embajadores alistan tus productos', true);
  update public.orders set status = 'preparando' where id = o1;
  perform set_config('app.status_note', 'Todo llegó a la bodega de Neiva', true);
  update public.orders set status = 'consolidado' where id = o1;
  perform set_config('app.status_note', 'Salió con Servientrega', true);
  update public.orders set status = 'enviado' where id = o1;
  perform set_config('app.status_note', 'Recibido en portería', true);
  update public.orders set status = 'entregado' where id = o1;
  update public.order_items set item_status = 'recibido_en_bodega', ready_at = now() - interval '12 days', received_at = now() - interval '11 days' where order_id = o1;

  perform set_config('app.status_note', '', true);   -- la nota no debe pasar al pedido siguiente

  -- Pedido 2: en camino, con el kit Ruta del Cacao (precio repartido entre sus productos)
  insert into public.orders (user_id, email, customer_name, customer_phone, shipping_address, subtotal, shipping, total, carrier, tracking_code, estimated_delivery, created_at)
  values (uid, 'cliente@mercadoorigen.test', 'Cliente de Prueba', '3001234567', addr, 138990, 12000, 150990,
          'Interrapidísimo', '700154238811', current_date + 2, now() - interval '3 days')
  returning id into o2;
  insert into public.order_items (order_id, product_id, kit_id, ambassador_id, sku, name, unit_price, quantity)
  select o2, p.id, q.kit, p.ambassador_id, p.sku, p.name, q.price, 1
  from (values (p_susana, v_kit, 72353), (p_bried, v_kit, 22899), (p_shalena, v_kit, 13748), (p_miel, null::uuid, 29990)) q(pid, kit, price)
  join public.products p on p.id = q.pid;
  insert into public.payments (order_id, reference, amount_in_cents, status, payment_method_type)
  values (o2, 'DEMO-' || left(o2::text, 8), 15099000, 'APPROVED', 'NEQUI');

  perform set_config('app.status_note', 'Los embajadores alistan tus productos', true);
  update public.orders set status = 'preparando' where id = o2;
  perform set_config('app.status_note', 'Todo llegó a la bodega de Neiva', true);
  update public.orders set status = 'consolidado' where id = o2;
  perform set_config('app.status_note', 'Salió con Interrapidísimo', true);
  update public.orders set status = 'enviado' where id = o2;
  update public.order_items set item_status = 'recibido_en_bodega', ready_at = now() - interval '2 days', received_at = now() - interval '2 days' where order_id = o2;
  perform set_config('app.status_note', '', true);

  -- Pedido 3: de un invitado, recién pagado: los embajadores aún deben prepararlo.
  perform set_config('app.status_note', '', true);
  declare o3 uuid;
  begin
    insert into public.orders (email, customer_name, customer_phone, shipping_address, subtotal, shipping, total, created_at)
    values ('invitada@demo.local', 'Invitada Demo', '3009998877',
            '{"recipient":"Invitada Demo","phone":"3009998877","department":"Antioquia","city":"Medellín","address_line":"Carrera 70 # 44-10"}',
            177000, 0, 177000, now() - interval '5 hours')
    returning id into o3;
    insert into public.order_items (order_id, product_id, ambassador_id, sku, name, unit_price, quantity)
    select o3, p.id, p.ambassador_id, p.sku, p.name, p.price, q.qty
    from (values (p_susana, 2), (p_achiras, 1)) q(pid, qty) join public.products p on p.id = q.pid;
    insert into public.payments (order_id, reference, amount_in_cents, status, payment_method_type)
    values (o3, 'DEMO-' || left(o3::text, 8), 17700000, 'APPROVED', 'CARD');
  end;

  -- Fechas escalonadas para que la línea de tiempo se vea real
  update public.order_status_history h set created_at = o.created_at + s.offs
  from public.orders o,
       (values ('pendiente_pago'::public.order_status, interval '0'), ('pagado', interval '5 minutes'), ('preparando', interval '1 day'),
               ('consolidado', interval '2 days'), ('enviado', interval '2 days 4 hours'), ('entregado', interval '5 days')) s(st, offs)
  where h.order_id = o.id and o.id in (o1, o2) and h.status = s.st;
  update public.orders set paid_at = created_at + interval '5 minutes' where id in (o1, o2);
end $$;

-- Los pedidos de demostración no envían correos.
update public.email_outbox set status = 'omitido', last_error = 'Pedido de demostración' where status = 'pendiente';
