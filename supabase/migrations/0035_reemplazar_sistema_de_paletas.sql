alter table negocio drop constraint negocio_color_palette_check;
alter table negocio add constraint negocio_color_palette_check check (color_palette = any (array['apple','notion','spotify']));
