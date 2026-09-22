-- =========================================================
-- Лабораторная работа №3 — Схема базы данных (Supabase)
-- Выполнить: Supabase -> SQL Editor -> New query -> вставить весь файл -> Run
-- =========================================================

-- 1. Таблица групп
create table if not exists groups (
  id   bigint generated always as identity primary key,
  name text not null unique
);

-- 2. Таблица расписания
create table if not exists schedule (
  id             bigint generated always as identity primary key,
  group_id       bigint references groups(id) on delete cascade,
  day_of_week    smallint not null,   -- 1 = Пн, 2 = Вт, 3 = Ср, 4 = Чт, 5 = Пт, 6 = Сб
  lesson_number  smallint not null,   -- номер пары, 1..6
  subject_name   text not null,       -- предмет (без имени преподавателя)
  room           text,                -- кабинет (может быть пустым, напр. физкультура)
  time_start     time not null,
  time_end       time not null
);

create index if not exists idx_schedule_group_day on schedule (group_id, day_of_week);

-- =========================================================
-- Тестовые данные
-- =========================================================

-- Группа из вашего расписания
insert into groups (name) values ('ПО-33')
  on conflict (name) do nothing;

-- Вторая группа — для примера (замените/дополните своими реальными данными)
insert into groups (name) values ('ИС-21')
  on conflict (name) do nothing;

-- -------------------------------------------------------
-- Звонки, которые используются ниже:
-- Вторник–пятница: 1) 08:30-10:00  2) 10:10-11:40  3) 12:20-13:50
--                   4) 14:00-15:30 5) 15:40-17:10  6) 17:20-18:40
-- Понедельник (с кураторским часом): 1) 08:30-09:50  2) 10:40-12:00
--                   3) 12:40-14:00 4) 14:10-15:30  5) 15:40-17:00  6) 17:20-18:40
-- -------------------------------------------------------

-- ===================== ПО-33: ПОНЕДЕЛЬНИК (day_of_week = 1) =====================
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 3, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '12:40', '14:00'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 4, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '14:10', '15:30'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 5, 'ПМ 5. Рефакторинг программного кода', '107а', '15:40', '17:00'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 6, 'ПМ 5. Рефакторинг программного кода', '107а', '17:20', '18:40'
from groups where name = 'ПО-33';

-- ===================== ПО-33: ВТОРНИК (day_of_week = 2) =====================
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 2, 2, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '10:10', '11:40'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 2, 3, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '12:20', '13:50'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 2, 4, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '14:00', '15:30'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 2, 5, 'ПМ 5. Рефакторинг программного кода', '107а', '15:40', '17:10'
from groups where name = 'ПО-33';

-- ===================== ПО-33: СРЕДА (day_of_week = 3) =====================
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 3, 2, 'РО 5.4. Рефакторинг программного кода / Физическая культура (по подгруппам)', '115 / спортзал', '10:10', '11:40'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 3, 3, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '12:20', '13:50'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 3, 4, 'ПМ 5. Рефакторинг программного кода', '107а', '14:00', '15:30'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 3, 5, 'ООМ 4. Применение основ социальных наук', '321', '15:40', '17:10'
from groups where name = 'ПО-33';

-- ===================== ПО-33: ЧЕТВЕРГ (day_of_week = 4) =====================
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 4, 2, 'Физическая культура', null, '10:10', '11:40'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 4, 3, 'ООМ 4. Применение основ социальных наук', '321', '12:20', '13:50'
from groups where name = 'ПО-33';

-- ===================== ПО-33: ПЯТНИЦА (day_of_week = 5) =====================
-- ВНИМАНИЕ: на фото расписание в пятницу обрезано снизу, 5-я и 6-я пара не видны.
-- Проверьте и дополните эти две строки вручную через Table Editor в Supabase.
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 5, 1, 'ПМ 6. Проектирование и выполнение работ по созданию и модификации Web-ресурсов', '117', '08:30', '10:00'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 5, 2, 'Физическая культура', null, '10:10', '11:40'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 5, 3, 'РО 5.4. Рефакторинг программного кода', '115', '12:20', '13:50'
from groups where name = 'ПО-33';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 5, 4, 'РО 5.4 / ПМ 5. Рефакторинг программного кода (по подгруппам)', '115 / 107а', '14:00', '15:30'
from groups where name = 'ПО-33';

-- ===================== ИС-21: пример данных (замените на реальные) =====================
insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 1, 'Пример: Введение в программирование', '201', '08:30', '09:50'
from groups where name = 'ИС-21';

insert into schedule (group_id, day_of_week, lesson_number, subject_name, room, time_start, time_end)
select id, 1, 2, 'Пример: Базы данных', '202', '10:40', '12:00'
from groups where name = 'ИС-21';
