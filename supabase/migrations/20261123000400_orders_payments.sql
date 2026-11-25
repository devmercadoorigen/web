-- =====================================================================
-- Mercado Origen · 0400 · Cupones, pedidos, pagos Wompi y liquidaciones
-- Los pedidos y pagos los escriben solo las Edge Functions (service_role)
-- y las funciones de esta migración; el frontend solo lee.
-- =====================================================================

create table public.coupons (
  id                  uuid primary key default gen_random_uuid(),
  code                extensions.citext not null unique,
  description         text,
  type                public.coupon_type not null,
  value               integer not null check (value > 0),     -- % (1-100) o COP
  min_order           integer not null default 0 check (min_order >= 0),
  max_uses            integer check (max_uses is null or max_uses > 0),
  max_uses_per_customer integer not null default 1 check (max_uses_per_customer > 0),
  uses                integer not null default 0,
  first_purchase_only boolean not null default false,
  starts_at           timestamptz,
  expires_at          timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (type <> 'porcentaje' or value <= 100)
);
create trigger coupons_updated before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Pedidos. Se permite compra como invitado: user_id puede ser null y el
-- pedido se identifica por correo + access_token.
-- ---------------------------------------------------------------------
create sequence public.order_number_seq;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique default (
                       'MO-' || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-' ||
                       lpad(nextval('public.order_number_seq')::text, 6, '0')),
  user_id            uuid references public.profiles (id) on delete set null,
  email              extensions.citext not null,
  customer_name      text not null,
  customer_phone     text,
  customer_document  text,
  status             public.order_status not null default 'pendiente_pago',
  subtotal           integer not null default 0 check (subtotal >= 0),
  discount           integer not null default 0 check (discount >= 0),
  shipping           integer not null default 0 check (shipping >= 0),
  total              integer not null default 0 check (total >= 0),
  coupon_id          uuid references public.coupons (id) on delete set null,
  coupon_code        text,
  shipping_address   jsonb not null,
  carrier            text,
  tracking_code      text,
  estimated_delivery date,
  customer_notes     text,
  stock_deducted     boolean not null default false,
  needs_review       boolean not null default false,  -- p. ej. pago aprobado sin stock suficiente
  review_reason      text,
  access_token       uuid not null default gen_random_uuid(),  -- consulta del invitado
  paid_at            timestamptz,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  status_changed_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_email_idx on public.orders (email);
create index orders_status_idx on public.orders (status, status_changed_at);
create index orders_created_idx on public.orders (created_at desc);
create index orders_review_idx on public.orders (needs_review) where needs_review;
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  variant_id      uuid references public.product_variants (id) on delete set null,
  kit_id          uuid references public.kits (id) on delete set null,   -- si llegó dentro de un kit
  ambassador_id   uuid not null references public.ambassadors (id) on delete restrict,
  sku             text not null,                  -- copia al momento de la compra
  name            text not null,                  -- copia al momento de la compra
  unit_price      integer not null check (unit_price >= 0),
  quantity        integer not null check (quantity > 0),
  line_total      integer generated always as (unit_price * quantity) stored,
  item_status     public.order_item_status not null default 'pendiente',
  ready_at        timestamptz,
  received_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_ambassador_idx on public.order_items (ambassador_id, created_at desc);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_kit_idx on public.order_items (kit_id) where kit_id is not null;

create table public.order_status_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     public.order_status not null,
  note       text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.coupon_redemptions (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons (id) on delete cascade,
  order_id   uuid not null unique references public.orders (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  email      extensions.citext not null,
  amount     integer not null,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, email);

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  provider             text not null default 'wompi',
  reference            text not null unique,      -- referencia enviada a Wompi
  wompi_transaction_id text unique,
  amount_in_cents      bigint not null check (amount_in_cents > 0),
  currency             text not null default 'COP',
  status               public.payment_status not null default 'PENDING',
  status_message       text,
  payment_method_type  text,                      -- CARD, PSE, NEQUI, …
  last_event_id        text,                      -- idempotencia del webhook
  raw_event            jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status, created_at desc);
create trigger payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- Eventos del webhook ya procesados (para ignorar duplicados).
create table public.payment_events (
  id          bigint generated always as identity primary key,
  provider    text not null default 'wompi',
  event_key   text not null unique,               -- transacción + estado + timestamp del evento
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Liquidaciones a embajadores
--  ambassador_ledger: una fila por order_item cuando el pago se aprueba
--  ambassador_payouts: agrupa las filas de un período y se marca pagado
-- ---------------------------------------------------------------------
create table public.ambassador_payouts (
  id            uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id) on delete restrict,
  period_start  date not null,
  period_end    date not null,
  gross         integer not null default 0,
  commission    integer not null default 0,
  net           integer not null default 0,
  status        public.payout_status not null default 'pendiente',
  paid_at       timestamptz,
  receipt_url   text,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (period_end >= period_start),
  unique (ambassador_id, period_start, period_end)
);
create index ambassador_payouts_amb_idx on public.ambassador_payouts (ambassador_id, period_start desc);
create trigger ambassador_payouts_updated before update on public.ambassador_payouts
  for each row execute function public.set_updated_at();

create table public.ambassador_ledger (
  id              uuid primary key default gen_random_uuid(),
  order_item_id   uuid not null unique references public.order_items (id) on delete cascade,
  order_id        uuid not null references public.orders (id) on delete cascade,
  ambassador_id   uuid not null references public.ambassadors (id) on delete restrict,
  gross           integer not null,
  commission_rate numeric(5, 2),                  -- null = comisión aún no acordada
  commission      integer,
  net             integer,
  payout_id       uuid references public.ambassador_payouts (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index ambassador_ledger_amb_idx on public.ambassador_ledger (ambassador_id, created_at);
create index ambassador_ledger_unpaid_idx on public.ambassador_ledger (ambassador_id) where payout_id is null;

-- ---------------------------------------------------------------------
-- Historial de estados y fechas del pedido
-- La nota se pasa con: select set_config('app.status_note', '…', true)
-- ---------------------------------------------------------------------
create or replace function public.orders_status_timestamps()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := now();
    case new.status
      when 'pagado'     then new.paid_at := coalesce(new.paid_at, now());
      when 'enviado'    then new.shipped_at := coalesce(new.shipped_at, now());
      when 'entregado'  then new.delivered_at := coalesce(new.delivered_at, now());
      when 'cancelado'  then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end $$;

create trigger orders_status_timestamps before insert or update of status on public.orders
  for each row execute function public.orders_status_timestamps();

create or replace function public.orders_log_status()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (new.id, new.status, nullif(current_setting('app.status_note', true), ''), auth.uid());
  end if;
  return new;
end $$;

create trigger orders_log_status after insert or update of status on public.orders
  for each row execute function public.orders_log_status();

create trigger audit_orders after update or delete on public.orders
  for each row execute function public.audit_admin_changes();
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_admin_changes();
create trigger audit_payouts after insert or update or delete on public.ambassador_payouts
  for each row execute function public.audit_admin_changes();
create trigger audit_order_items after update on public.order_items
  for each row execute function public.audit_admin_changes();
