const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_NAMES_FULL = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const groupSelect = document.getElementById('group-select');
const daysNav = document.getElementById('days-nav');
const lessonsList = document.getElementById('lessons-list');
const nowStatus = document.getElementById('now-status');
const nowDetail = document.getElementById('now-detail');
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date-display');

let scheduleCache = [];
let selectedDay = jsDayToOurDay(new Date().getDay());
let selectedGroupId = null;

// В базе: 1=Пн ... 6=Сб. В JS Date.getDay(): 0=Вс, 1=Пн ... 6=Сб.
function jsDayToOurDay(jsDay) {
  return jsDay === 0 ? 6 : jsDay; // воскресенье считаем последним, пар нет
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(t) {
  return t.slice(0, 5);
}

async function loadGroups() {
  const { data, error } = await supabaseClient.from('groups').select('id, name').order('name');
  if (error) {
    groupSelect.innerHTML = '<option value="">Ошибка загрузки групп</option>';
    console.error(error);
    return;
  }
  groupSelect.innerHTML = data.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  if (data.length) {
    selectedGroupId = data[0].id;
    groupSelect.value = selectedGroupId;
    await loadSchedule();
  }
}

async function loadSchedule() {
  if (!selectedGroupId) return;
  const { data, error } = await supabaseClient
    .from('schedule')
    .select('*')
    .eq('group_id', selectedGroupId)
    .order('day_of_week', { ascending: true })
    .order('lesson_number', { ascending: true });
  if (error) {
    lessonsList.innerHTML = '<p class="lessons__empty">Не удалось загрузить расписание.</p>';
    console.error(error);
    return;
  }
  scheduleCache = data;
  renderDaysNav();
  renderDay(selectedDay);
  renderNow();
}

function renderDaysNav() {
  const today = jsDayToOurDay(new Date().getDay());
  daysNav.innerHTML = '';
  for (let day = 1; day <= 6; day++) {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (day === selectedDay ? ' active' : '') + (day === today ? ' today' : '');
    btn.textContent = DAY_NAMES[day];
    btn.addEventListener('click', () => {
      selectedDay = day;
      renderDaysNav();
      renderDay(day);
    });
    daysNav.appendChild(btn);
  }
}

function renderDay(day) {
  const lessons = scheduleCache.filter(l => l.day_of_week === day);
  const today = jsDayToOurDay(new Date().getDay());
  const nowMin = nowMinutes();

  if (!lessons.length) {
    lessonsList.innerHTML = `<p class="lessons__empty">${DAY_NAMES_FULL[day]}: пар нет.</p>`;
    return;
  }

  lessonsList.innerHTML = lessons.map(l => {
    const isCurrent = day === today &&
      nowMin >= timeToMinutes(l.time_start) &&
      nowMin < timeToMinutes(l.time_end);
    return `
      <div class="lesson${isCurrent ? ' current' : ''}">
        <div class="lesson__time">${formatTime(l.time_start)}<br>${formatTime(l.time_end)}</div>
        <div>
          <span class="lesson__number">${l.lesson_number} пара</span>
          <p class="lesson__subject">${l.subject_name}</p>
          ${l.room ? `<p class="lesson__room">Каб. ${l.room}</p>` : ''}
        </div>
      </div>`;
  }).join('');
}

// Аналог команды /now — определяет текущую пару, перемену или конец дня.
function renderNow() {
  const today = jsDayToOurDay(new Date().getDay());
  const todayLessons = scheduleCache
    .filter(l => l.day_of_week === today)
    .sort((a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start));

  if (new Date().getDay() === 0 || !todayLessons.length) {
    nowStatus.textContent = 'Сегодня пар нет';
    nowDetail.textContent = '';
    return;
  }

  const nowMin = nowMinutes();
  const current = todayLessons.find(l => nowMin >= timeToMinutes(l.time_start) && nowMin < timeToMinutes(l.time_end));

  if (current) {
    nowStatus.textContent = `Идёт ${current.lesson_number} пара — ${current.subject_name}`;
    nowDetail.textContent = `${formatTime(current.time_start)}–${formatTime(current.time_end)}` +
      (current.room ? ` · каб. ${current.room}` : '');
    return;
  }

  const next = todayLessons.find(l => timeToMinutes(l.time_start) > nowMin);
  if (next) {
    nowStatus.textContent = 'Перемена';
    nowDetail.textContent = `Следующая: ${next.lesson_number} пара в ${formatTime(next.time_start)} — ${next.subject_name}`;
    return;
  }

  nowStatus.textContent = 'На сегодня все пары закончились';
  nowDetail.textContent = '';
}

function tickClock() {
  clockEl.textContent = new Date().toLocaleTimeString('ru-RU');
}

function tickDate() {
  dateEl.textContent = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

groupSelect.addEventListener('change', async (e) => {
  selectedGroupId = e.target.value;
  await loadSchedule();
});

setInterval(() => {
  tickClock();
  renderNow();
  renderDay(selectedDay);
}, 1000);
setInterval(tickDate, 60 * 1000);

tickClock();
tickDate();
loadGroups();


