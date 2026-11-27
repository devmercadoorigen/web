-- Kits del inicio: 12 % de ahorro sobre lo que cuestan sus productos por separado.
-- Precio = separado × 0,88, redondeado hacia abajo a la centena (el ahorro queda en 12 % o un poco más).
update public.kits k
set price = (floor(s.separate_price * 0.88 / 100) * 100)::int
from public.kit_summaries s
where s.kit_id = k.id
  and k.is_active and k.show_on_home
  and s.separate_price > 0;
