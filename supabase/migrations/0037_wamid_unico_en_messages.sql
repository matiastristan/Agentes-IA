-- Evita procesar dos veces el mismo mensaje cuando Meta reenvía un webhook.
create unique index if not exists messages_wamid_unique on messages(wamid) where wamid is not null;
