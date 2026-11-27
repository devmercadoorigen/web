-- Lista completa de tipos de correo de email_outbox. Corrige el caso en que
-- 20261201000500_more_emails.sql se volvió a ejecutar después de la ruleta y dejó
-- fuera 'premio_ruleta' (el giro fallaba con email_outbox_kind_check).
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'pedido_confirmado', 'pedido_estado', 'producto_revisado',
  'bienvenida', 'pago_rechazado', 'pedido_embajador', 'pedido_admin',
  'solicitud_recibida', 'solicitud_admin', 'solicitud_rechazada', 'premio_ruleta'));
