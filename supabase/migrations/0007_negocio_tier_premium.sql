alter table negocio drop constraint negocio_tier_check;
alter table negocio add constraint negocio_tier_check
  check (tier in ('base', 'pro', 'premium'));
