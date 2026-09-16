alter table messages add column wamid text unique;
alter table messages add column status text not null default 'sent'
  check (status in ('pending', 'sent', 'delivered', 'read', 'failed'));
alter table messages add column status_error text;

create index idx_messages_wamid on messages(wamid);
