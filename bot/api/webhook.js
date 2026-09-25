const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// polling: false — бот НЕ опрашивает Telegram сам, только отправляет сообщения.
// Получать сообщения он будет через вебхук (эту функцию).
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

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

// Выбор группы храним в Supabase (а не в памяти) — иначе на serverless он бы терялся.
async function getUserGroup(chatId) {
  const { data, error } = await supabase
    .from('bot_users')
    .select('group_id')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (error) throw error;
  return data ? data.group_id : null;
}

async function setUserGroup(chatId, groupId) {
  const { error } = await supabase.from('bot_users').upsert({ chat_id: chatId, group_id: groupId });
  if (error) throw error;
}

function mainMenu() {
  return {
    reply_markup: {
      keyboard: [['/today'], ['/now'], ['/group']],
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

async function handleToday(chatId) {
  const groupId = await getUserGroup(chatId);
  if (!groupId) {
    await bot.sendMessage(chatId, 'Сначала выберите группу.');
    return askGroup(chatId);
  }
  if (new Date().getDay() === 0) {
    return bot.sendMessage(chatId, 'Сегодня воскресенье — пар нет.');
  }

  const day = jsDayToOurDay(new Date().getDay());
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
}

async function handleNow(chatId) {
  const groupId = await getUserGroup(chatId);
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
}

async function handleUpdate(update) {
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = msg.text || '';

    if (/^\/start/.test(text)) {
      await bot.sendMessage(chatId, 'Привет! Это бот расписания. Сначала выберите группу.');
      return askGroup(chatId);
    }
    if (/^\/group/.test(text)) {
      return askGroup(chatId);
    }
    if (/^\/today/.test(text)) {
      return handleToday(chatId);
    }
    if (/^\/now/.test(text)) {
      return handleNow(chatId);
    }
    return;
  }

  if (update.callback_query) {
    const query = update.callback_query;
    const [, groupId, groupName] = query.data.split(':');
    await setUserGroup(query.message.chat.id, Number(groupId));
    await bot.answerCallbackQuery(query.id, { text: `Группа ${groupName} выбрана` });
    await bot.sendMessage(query.message.chat.id, `Группа установлена: ${groupName}`, mainMenu());
  }
}

// Vercel вызывает эту функцию на каждый POST-запрос от Telegram (на URL /api/webhook)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(200).send('Bot webhook is running');
    return;
  }
  try {
    await handleUpdate(req.body);
  } catch (err) {
    console.error(err);
  }
  res.status(200).send('OK');
};
