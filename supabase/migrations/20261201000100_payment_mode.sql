-- Modo de pagos (prueba / producción) que el admin cambia desde /admin/pagos.
--  · site_settings 'payments' = { "wompi_mode": "sandbox" | "production" }
--    Lo leen las Edge Functions para escoger el juego de llaves de Wompi.
--  · payments.environment guarda con qué ambiente se creó cada intento de pago,
--    para consultar/validar la transacción con las llaves correctas aunque
--    después se cambie de modo, y para marcar los pedidos de prueba en el admin.

alter table public.payments
  add column environment text not null default 'sandbox'
  check (environment in ('sandbox', 'production'));

create index payments_environment_idx on public.payments (environment);

insert into public.site_settings (key, value)
values ('payments', '{"wompi_mode": "sandbox"}')
on conflict (key) do nothing;
