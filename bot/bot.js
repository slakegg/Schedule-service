require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не задан. Проверьте файл .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Храним выбранную группу для каждого чата (в памяти; для учебного проекта этого достаточно)
const userGroup = new Map();

const DAY_NAMES = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function jsDayToOurDay(jsDay) {
  return jsDay === 0 ? 6 : jsDay;
}
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function fmt(t) {
  return t.slice(0, 5);
}

async function getGroups() {
  const { data, error } = await supabase.from('groups').select('id, name').order('name');
  if (error) throw error;
  return data;
}

async function getScheduleForDay(groupId, day) {
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('group_id', groupId)
    .eq('day_of_week', day)
    .order('lesson_number');
  if (error) throw error;
  return data;
}

function mainMenu() {
  return {
    reply_markup: {
      keyboard: [['📅 /today Расписание на сегодня'], ['⏰ /now Какая пара сейчас'], ['🔄 /group Сменить группу']],
      resize_keyboard: true,
    },
  };
}

async function askGroup(chatId) {
  const groups = await getGroups();
  const buttons = groups.map(g => ([{ text: g.name, callback_data: `group:${g.id}:${g.name}` }]));
  await bot.sendMessage(chatId, 'Выберите вашу группу:', {
    reply_markup: { inline_keyboard: buttons },
  });
}

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(msg.chat.id, 'Привет! Это бот расписания. Сначала выберите группу.');
  await askGroup(msg.chat.id);
});

bot.onText(/\/group/, async (msg) => {
  await askGroup(msg.chat.id);
});

bot.on('callback_query', async (query) => {
  const [, groupId, groupName] = query.data.split(':');
  userGroup.set(query.message.chat.id, Number(groupId));
  await bot.answerCallbackQuery(query.id, { text: `Группа ${groupName} выбрана` });
  await bot.sendMessage(query.message.chat.id, `Группа установлена: ${groupName}`, mainMenu());
});

bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;
  const groupId = userGroup.get(chatId);
  if (!groupId) {
    await bot.sendMessage(chatId, 'Сначала выберите группу.');
    return askGroup(chatId);
  }

  const day = jsDayToOurDay(new Date().getDay());
  if (new Date().getDay() === 0) {
    return bot.sendMessage(chatId, 'Сегодня воскресенье — пар нет.');
  }

  const lessons = await getScheduleForDay(groupId, day);
  if (!lessons.length) {
    return bot.sendMessage(chatId, `${DAY_NAMES[day]}: пар нет.`);
  }

  const text = [`Расписание на сегодня (${DAY_NAMES[day]}):`, ''].concat(
    lessons.map(l =>
      `${l.lesson_number} пара, ${fmt(l.time_start)}–${fmt(l.time_end)}\n${l.subject_name}${l.room ? ` · каб. ${l.room}` : ''}`
    )
  ).join('\n\n');

  await bot.sendMessage(chatId, text);
});

bot.onText(/\/now/, async (msg) => {
  const chatId = msg.chat.id;
  const groupId = userGroup.get(chatId);
  if (!groupId) {
    await bot.sendMessage(chatId, 'Сначала выберите группу.');
    return askGroup(chatId);
  }

  if (new Date().getDay() === 0) {
    return bot.sendMessage(chatId, 'Сегодня воскресенье — пар нет.');
  }

  const day = jsDayToOurDay(new Date().getDay());
  const lessons = (await getScheduleForDay(groupId, day))
    .sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start));

  if (!lessons.length) {
    return bot.sendMessage(chatId, 'Сегодня пар нет.');
  }

  const nowMin = nowMinutes();
  const current = lessons.find(l => nowMin >= timeToMinutes(l.time_start) && nowMin < timeToMinutes(l.time_end));

  if (current) {
    return bot.sendMessage(
      chatId,
      `Сейчас идёт ${current.lesson_number} пара: ${current.subject_name} (${fmt(current.time_start)}–${fmt(current.time_end)})${current.room ? `, каб. ${current.room}` : ''}`
    );
  }

  const next = lessons.find(l => timeToMinutes(l.time_start) > nowMin);
  if (next) {
    return bot.sendMessage(chatId, `Сейчас перемена. Следующая пара в ${fmt(next.time_start)} — ${next.subject_name}`);
  }

  await bot.sendMessage(chatId, 'На сегодня все пары закончились.');
});

console.log('Бот запущен...');
