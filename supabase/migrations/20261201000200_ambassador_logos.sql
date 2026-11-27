-- Logos de marca de los embajadores (copiados de la vitrina anterior, servidos desde public/img/ambassadors).
-- Solo rellena los que no tienen imagen, para no pisar una foto que el embajador haya subido.
update public.ambassadors a set avatar_url = '/img/ambassadors/' || a.slug || '.webp'
where a.avatar_url is null and a.slug in (
  'acacias-fit',
  'adames-resortwear',
  'apifit',
  'artbacu',
  'bambuqueras',
  'bried-chocolateria',
  'cafe-horizonte-fc',
  'cerveceria-indian',
  'chocolate-mama-susana',
  'chocolateria-shalena',
  'ecoproser',
  'herencia-obsequios-huilenses',
  'la-petit-huila',
  'maca-joyas-y-accesorios',
  'macchi-infinite',
  'musas-victorianas',
  'tachacoa'
);
