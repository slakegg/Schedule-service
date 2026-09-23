-- Выполнить в Supabase: SQL Editor -> New query -> вставить -> Run
-- Хранит, какую группу выбрал каждый чат в Telegram (нужно для бота на Vercel,
-- т.к. serverless-функция не может держать это в оперативной памяти между запросами).

create table if not exists bot_users (
  chat_id  bigint primary key,
  group_id bigint references groups(id) on delete cascade
);
