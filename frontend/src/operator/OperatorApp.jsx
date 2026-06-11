import React, { useEffect, useState } from 'react';
import { api, fmtDate, getToken } from '../api.js';
import Chat from '../components/Chat.jsx';

/* Операторская админ-панель (раздел 8 ТЗ): дашборд, заявки с фильтрами,
   тревоги, звонки, чат, подопечные, партнёры, промокоды, аналитика. */

const PAGES = [
  { id: 'dashboard', label: '📊 Дашборд' },
  { id: 'requests', label: '📋 Заявки' },
  { id: 'emergencies', label: '🚨 Тревоги' },
  { id: 'calls', label: '📞 Звонки' },
  { id: 'chat', label: '💬 Чаты семей' },
  { id: 'elders', label: '👴 Подопечные' },
  { id: 'partners', label: '🤝 Партнёры' },
  { id: 'analytics', label: '📈 Аналитика' },
  { id: 'promos', label: '🎁 Промокоды', adminOnly: true },
];

const STATUSES = [
  'new', 'needs_clarification', 'accepted', 'awaiting_payment', 'sent_to_partner',
  'in_progress', 'done', 'cancelled', 'overdue', 'emergency',
];

export default function OperatorApp({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">ВнучОК · {user.role === 'admin' ? 'Админ' : 'Оператор'}</div>
        {PAGES.filter((p) => !p.adminOnly || user.role === 'admin').map((p) => (
          <button key={p.id} className={page === p.id ? 'nav-item active' : 'nav-item'}
                  onClick={() => setPage(p.id)}>
            {p.label}
          </button>
        ))}
        <div className="sidebar-footer">
          <span className="muted small">{user.full_name}</span>
          <button className="btn link small" onClick={onLogout}>Выйти</button>
        </div>
      </aside>
      <main className="admin-main">
        {page === 'dashboard' && <AdminDashboard goTo={setPage} />}
        {page === 'requests' && <RequestsBoard user={user} />}
        {page === 'emergencies' && <Emergencies />}
        {page === 'calls' && <Calls />}
        {page === 'chat' && <FamilyChats />}
        {page === 'elders' && <Elders />}
        {page === 'partners' && <Partners isAdmin={user.role === 'admin'} />}
        {page === 'analytics' && <Analytics />}
        {page === 'promos' && <Promos />}
      </main>
    </div>
  );
}

function StatCard({ value, label, alarm, onClick }) {
  return (
    <button className={`stat-card ${alarm && value > 0 ? 'stat-alarm' : ''}`} onClick={onClick}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </button>
  );
}

function AdminDashboard({ goTo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = () => api('/admin/dashboard').then(setStats).catch(() => {});
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!stats) return <p>Загрузка…</p>;
  return (
    <>
      <h1>Дашборд оператора</h1>
      <div className="stat-grid">
        <StatCard value={stats.open_emergencies} label="Открытые тревоги" alarm
                  onClick={() => goTo('emergencies')} />
        <StatCard value={stats.emergency_requests} label="Тревожные заявки" alarm
                  onClick={() => goTo('requests')} />
        <StatCard value={stats.new_requests} label="Новые заявки" onClick={() => goTo('requests')} />
        <StatCard value={stats.in_progress} label="В работе" onClick={() => goTo('requests')} />
        <StatCard value={stats.awaiting_partner} label="У партнёра" onClick={() => goTo('requests')} />
        <StatCard value={stats.awaiting_payment} label="Ждут оплаты" onClick={() => goTo('requests')} />
        <StatCard value={stats.overdue_requests} label="Просроченные" alarm
                  onClick={() => goTo('requests')} />
        <StatCard value={stats.elders_without_contact} label="Без связи 2+ дня" alarm
                  onClick={() => goTo('elders')} />
        <StatCard value={stats.calls_today} label="Запланированные звонки"
                  onClick={() => goTo('calls')} />
        <StatCard value={stats.total_elders} label="Всего подопечных"
                  onClick={() => goTo('elders')} />
      </div>
    </>
  );
}

function RequestsBoard({ user }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const reload = () =>
    api(`/requests${filter ? `?status=${filter}` : ''}`).then(setRequests).catch(() => {});
  useEffect(reload, [filter]);

  return (
    <div className="split">
      <div>
        <h1>Заявки</h1>
        <button className="btn small" style={{ float: 'right' }} onClick={async () => {
          const response = await fetch('/api/admin/export/requests.csv', {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'vnuchok_requests.csv';
          link.click();
          URL.revokeObjectURL(url);
        }}>⬇ Экспорт CSV</button>
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Все статусы</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <div className="request-list">
          {requests.map((r) => (
            <button key={r.id}
                    className={`request-row ${r.status === 'emergency' ? 'row-alarm' : ''} ${selected === r.id ? 'row-selected' : ''}`}
                    onClick={() => setSelected(r.id)}>
              <span><b>{r.number}</b> {r.priority === 'critical' && '🚨'}</span>
              <span>{r.elder_name}</span>
              <span>{r.category_label}</span>
              <span className={`pill pill-${r.status}`}>{r.status_label}</span>
              <span className="muted small">{fmtDate(r.created_at)}</span>
            </button>
          ))}
          {requests.length === 0 && <p className="muted">Заявок нет.</p>}
        </div>
      </div>
      {selected && (
        <RequestDetail id={selected} user={user}
                       onChanged={reload} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function statusLabel(code) {
  const map = {
    new: 'Новая', needs_clarification: 'Требует уточнения', accepted: 'Принята оператором',
    awaiting_payment: 'Ожидает оплаты', sent_to_partner: 'Передана партнёру',
    in_progress: 'В работе', done: 'Выполнена', cancelled: 'Отменена',
    overdue: 'Просрочена', emergency: 'Тревожная эскалация',
  };
  return map[code] || code;
}

function RequestDetail({ id, user, onChanged, onClose }) {
  const [req, setReq] = useState(null);
  const [partners, setPartners] = useState([]);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [cost, setCost] = useState('');

  const reload = () => api(`/requests/${id}`).then((r) => {
    setReq(r); setNewStatus(r.status); setCost(r.cost ?? '');
  });
  useEffect(() => { reload(); api('/admin/partners').then(setPartners); }, [id]);

  if (!req) return <div className="card">Загрузка…</div>;

  const apply = async () => {
    const body = { comment };
    if (newStatus !== req.status) body.status = newStatus;
    if (cost !== '' && +cost !== req.cost) body.cost = +cost;
    if (partnerId) body.partner_id = +partnerId;
    await api(`/requests/${id}`, { method: 'PATCH', body });
    setComment('');
    reload(); onChanged();
  };

  return (
    <div className="card detail-panel">
      <button className="btn link" onClick={onClose}>✕ Закрыть</button>
      <h2>{req.number} {req.priority === 'critical' && '🚨'}</h2>
      <p><span className={`pill pill-${req.status}`}>{req.status_label}</span>
        {' '}· {req.category_label} · источник: {sourceLabel(req.source)}</p>

      {req.elder && (
        <div className="info-block">
          <b>{req.elder.full_name}</b> {req.elder.is_social && <span className="pill">Социальный</span>}
          <div className="muted">{req.elder.phone} · {req.elder.address}</div>
        </div>
      )}

      {req.voice_text && (
        <div className="info-block">
          <b>Распознанный голос:</b> «{req.voice_text}»
          <div className="muted">AI: {req.category_label}, срочность {req.ai_urgency}</div>
          {req.ai_clarification && <div className="muted">Ответ агента: {req.ai_clarification}</div>}
        </div>
      )}
      {req.description && !req.voice_text && <p>{req.description}</p>}

      <div className="row">
        <button className="btn" onClick={async () => {
          await api(`/requests/${id}/assign`, { method: 'POST', body: {} });
          reload(); onChanged();
        }}>Взять в работу</button>
        <button className="btn primary" onClick={async () => {
          await api(`/requests/${id}/close`, { method: 'POST', body: { text: comment || 'Выполнена' } });
          setComment(''); reload(); onChanged();
        }}>Выполнена ✓</button>
      </div>

      <label>Статус</label>
      <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
      </select>
      <label>Партнёр</label>
      <select className="input" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
        <option value="">{req.partner_name || '— не назначен —'}</option>
        {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind})</option>)}
      </select>
      <label>Стоимость, ₽</label>
      <input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
      <label>Комментарий (увидит родственник)</label>
      <textarea className="input" rows={2} value={comment}
                onChange={(e) => setComment(e.target.value)} />
      <button className="btn primary" onClick={apply}>Применить изменения</button>
      <button className="btn" onClick={async () => {
        if (!comment.trim()) return;
        await api(`/requests/${id}/comment`, { method: 'POST', body: { text: comment } });
        setComment(''); reload();
      }}>Только комментарий</button>

      <h3>История</h3>
      {req.status_history.map((h, i) => (
        <div key={i} className="feed-item">
          <b>{h.status_label}</b>
          {h.comment && <span className="muted">{h.comment}</span>}
          <span className="muted small">{fmtDate(h.created_at)}{h.changed_by ? ` · ${h.changed_by}` : ''}</span>
        </div>
      ))}
      {req.comments.map((c) => (
        <div key={`c${c.id}`} className="feed-item">
          <b>💬 {c.author || '—'}</b>
          <span>{c.text}</span>
          <span className="muted small">{fmtDate(c.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

function sourceLabel(s) {
  return { voice: 'голос', button: 'кнопка', relative: 'родственник',
           operator: 'оператор', partner: 'партнёр' }[s] || s;
}

function Emergencies() {
  const [events, setEvents] = useState([]);
  const reload = () => api('/admin/emergencies').then(setEvents);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <h1>Тревожные события</h1>
      {events.length === 0 && <p className="muted">Тревог нет.</p>}
      {events.map((e) => (
        <div key={e.id} className={`card ${e.status === 'open' ? 'card-alarm' : ''}`}>
          <b>{e.status === 'open' ? '🚨 ОТКРЫТА' : '✅ Решена'} — {e.elder_name}</b>
          <p>{e.reason}</p>
          {e.resolution && <p className="muted">Решение: {e.resolution}</p>}
          <p className="muted small">{fmtDate(e.created_at)}</p>
          {e.status === 'open' && (
            <ResolveForm onResolve={async (text) => {
              await api(`/admin/emergencies/${e.id}/resolve`, {
                method: 'POST', body: { resolution: text },
              });
              reload();
            }} />
          )}
        </div>
      ))}
    </>
  );
}

function ResolveForm({ onResolve }) {
  const [text, setText] = useState('');
  return (
    <div className="row">
      <input className="input" placeholder="Что сделано (увидит родственник)"
             value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn primary" onClick={() => onResolve(text)}>Снять тревогу</button>
    </div>
  );
}

function Calls() {
  const [calls, setCalls] = useState([]);
  const [elders, setElders] = useState([]);
  const [elderId, setElderId] = useState('');

  const reload = () => api('/admin/calls').then(setCalls);
  useEffect(() => { reload(); api('/admin/elders').then(setElders); }, []);

  const RESULTS = [
    ['reached', 'Дозвонились'], ['all_good', 'Всё хорошо'],
    ['not_reached', 'Не дозвонились'], ['retry_needed', 'Нужен повтор'],
    ['escalation', 'Эскалация'],
  ];

  return (
    <>
      <h1>Звонки</h1>
      <div className="card">
        <h3>Запланировать звонок</h3>
        <div className="row">
          <select className="input" value={elderId} onChange={(e) => setElderId(e.target.value)}>
            <option value="">Выберите подопечного</option>
            {elders.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}{e.preferred_call_time ? ` (${e.preferred_call_time})` : ''}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={!elderId} onClick={async () => {
            await api('/admin/calls', { method: 'POST', body: { elder_id: +elderId } });
            setElderId(''); reload();
          }}>Запланировать</button>
        </div>
      </div>
      {calls.map((c) => (
        <div key={c.id} className="card">
          <b>{c.elder_name}</b> <span className="muted">{c.elder_phone}</span>
          <p className="muted small">{fmtDate(c.created_at)} ·
            результат: {RESULTS.find(([k]) => k === c.result)?.[1] || 'запланирован'}</p>
          {c.comment && <p>{c.comment}</p>}
          {c.result === 'planned' && (
            <CallResultForm onSave={async (result, comment) => {
              await api(`/admin/calls/${c.id}`, { method: 'PATCH', body: { result, comment } });
              reload();
            }} results={RESULTS} />
          )}
        </div>
      ))}
    </>
  );
}

function CallResultForm({ onSave, results }) {
  const [result, setResult] = useState('reached');
  const [comment, setComment] = useState('');
  return (
    <div className="row">
      <select className="input" value={result} onChange={(e) => setResult(e.target.value)}>
        {results.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <input className="input" placeholder="Комментарий для отчёта родственнику"
             value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn primary" onClick={() => onSave(result, comment)}>Сохранить</button>
    </div>
  );
}

function Elders() {
  const [elders, setElders] = useState([]);
  useEffect(() => { api('/admin/elders').then(setElders); }, []);

  return (
    <>
      <h1>Подопечные</h1>
      {elders.map((e) => (
        <div key={e.id} className={`card ${e.activity?.status === 'alarm' ? 'card-alarm' : ''}`}>
          <b>{e.full_name}</b>, {e.age ?? '—'} лет
          {e.is_social && <span className="pill"> Социальный контур{e.ngo_name ? `: ${e.ngo_name}` : ''}</span>}
          <p className="muted">{e.phone} · {e.address}</p>
          <p>Статус: <b>{e.activity?.label}</b> · последний контакт {fmtDate(e.activity?.last_checkin_at)}</p>
          {e.mobility_limits && <p className="muted">Мобильность: {e.mobility_limits}</p>}
          {e.operator_notes && <p className="muted">Заметки: {e.operator_notes}</p>}
          <p className="muted small">Код подключения: {e.connect_code}</p>
          <SocialToggle elder={e} onChanged={() => api('/admin/elders').then(setElders)} />
        </div>
      ))}
    </>
  );
}

function SocialToggle({ elder, onChanged }) {
  const [ngo, setNgo] = useState(elder.ngo_name || '');
  return (
    <div className="row">
      <input className="input" placeholder="НКО / фонд" value={ngo}
             onChange={(e) => setNgo(e.target.value)} />
      <button className="btn" onClick={async () => {
        await api(`/users/elder/${elder.id}`, {
          method: 'PATCH', body: { is_social: !elder.is_social, ngo_name: ngo },
        });
        onChanged();
      }}>
        {elder.is_social ? 'Убрать из соц. контура' : 'В социальный контур'}
      </button>
    </div>
  );
}

function FamilyChats() {
  const [elders, setElders] = useState([]);
  const [elderId, setElderId] = useState('');

  useEffect(() => { api('/admin/elders').then(setElders); }, []);

  return (
    <>
      <h1>Чаты семей</h1>
      <select className="input" value={elderId} onChange={(e) => setElderId(e.target.value)}>
        <option value="">Выберите подопечного</option>
        {elders.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
      </select>
      {elderId && (
        <div className="card">
          <Chat elderId={+elderId} />
        </div>
      )}
    </>
  );
}

function Partners({ isAdmin }) {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({ name: '', kind: 'retail', phone: '', city: '', contact_person: '' });

  const reload = () => api('/admin/partners').then(setPartners);
  useEffect(() => { reload(); }, []);

  const KINDS = {
    retail: 'Ритейл', pharmacy: 'Аптека', clinic: 'Клиника',
    household: 'Бытовые услуги', ngo: 'НКО', volunteer: 'Волонтёры',
  };

  return (
    <>
      <h1>Партнёры</h1>
      <div className="card">
        <h3>Добавить партнёра</h3>
        <div className="row">
          <input className="input" placeholder="Название" value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="row">
          <input className="input" placeholder="Телефон" value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Город" value={form.city}
                 onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <button className="btn primary" disabled={!form.name} onClick={async () => {
          await api('/admin/partners', { method: 'POST', body: form });
          setForm({ name: '', kind: 'retail', phone: '', city: '', contact_person: '' });
          reload();
        }}>Добавить</button>
      </div>
      {partners.map((p) => (
        <div key={p.id} className="card">
          <b>{p.name}</b> <span className="pill">{KINDS[p.kind] || p.kind}</span>
          {!p.is_active && <span className="pill pill-cancelled">Отключён</span>}
          <p className="muted">{p.city} · {p.phone} · {p.contact_person} · рейтинг {p.rating}</p>
          <button className="btn link" onClick={async () => {
            await api(`/admin/partners/${p.id}`, {
              method: 'PATCH', body: { is_active: !p.is_active },
            });
            reload();
          }}>
            {p.is_active ? 'Отключить' : 'Включить'}
          </button>
          {isAdmin && <PartnerUserForm partnerId={p.id} />}
        </div>
      ))}
    </>
  );
}

function PartnerUserForm({ partnerId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phone: '', full_name: '', password: '' });
  const [message, setMessage] = useState('');

  if (!open) {
    return <button className="btn link" onClick={() => setOpen(true)}>🔑 Создать логин кабинета</button>;
  }
  return (
    <div className="info-block">
      <b>Логин партнёрского кабинета</b>
      {message && <div className="alert info">{message}</div>}
      <div className="row">
        <input className="input" placeholder="Телефон" value={form.phone}
               onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="input" placeholder="Название/имя" value={form.full_name}
               onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="input" placeholder="Пароль" value={form.password}
               onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <button className="btn primary" disabled={!form.phone || !form.password}
              onClick={async () => {
                try {
                  await api(`/admin/partners/${partnerId}/user`, { method: 'POST', body: form });
                  setMessage('Логин создан. Партнёр входит во вкладке «Сотрудник».');
                } catch (e) {
                  setMessage(e.message);
                }
              }}>
        Создать
      </button>
    </div>
  );
}

function Promos() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState({ code: '', discount_percent: 10, uses_left: '' });

  const reload = () => api('/admin/promos').then(setPromos);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <h1>Промокоды</h1>
      <div className="card">
        <div className="row">
          <input className="input" placeholder="КОД" value={form.code}
                 onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <input className="input" type="number" placeholder="Скидка %"
                 value={form.discount_percent}
                 onChange={(e) => setForm({ ...form, discount_percent: +e.target.value })} />
          <input className="input" type="number" placeholder="Лимит (пусто = ∞)"
                 value={form.uses_left}
                 onChange={(e) => setForm({ ...form, uses_left: e.target.value })} />
          <button className="btn primary" disabled={!form.code} onClick={async () => {
            await api('/admin/promos', {
              method: 'POST',
              body: { ...form, uses_left: form.uses_left === '' ? null : +form.uses_left },
            });
            setForm({ code: '', discount_percent: 10, uses_left: '' });
            reload();
          }}>Создать</button>
        </div>
      </div>
      {promos.map((p) => (
        <div key={p.id} className="card">
          <b>{p.code}</b> — скидка {p.discount_percent}% ·
          осталось {p.uses_left ?? '∞'} ·
          {p.is_active ? ' действует' : ' выключен'}
          <button className="btn link" onClick={async () => {
            await api(`/admin/promos/${p.id}`, { method: 'PATCH' });
            reload();
          }}>{p.is_active ? 'Выключить' : 'Включить'}</button>
        </div>
      ))}
    </>
  );
}

function BarChart({ title, dates, values, color = '#2f7d5d' }) {
  const max = Math.max(...values, 1);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="chart">
        {values.map((v, i) => (
          <div key={i} className="chart-col" title={`${dates[i]}: ${v}`}>
            <div className="chart-bar"
                 style={{ height: `${(v / max) * 100}%`, background: color }} />
            <span className="chart-label">{dates[i].slice(8)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics() {
  const [data, setData] = useState(null);
  const [series, setSeries] = useState(null);
  useEffect(() => {
    api('/admin/analytics').then(setData);
    api('/admin/analytics/timeseries?days=14').then(setSeries).catch(() => {});
  }, []);
  if (!data) return <p>Загрузка…</p>;

  const ROWS = [
    ['Зарегистрировано родственников', data.relatives_registered],
    ['Подключено пожилых', data.elders_connected],
    ['Социальный контур', data.social_elders],
    ['Всего заявок', data.requests_total],
    ['Выполнено заявок', `${data.requests_done} (${data.completion_rate}%)`],
    ['Голосовых заявок', data.voice_requests],
    ['Повторных заказов', data.repeat_orders],
    ['Check-in событий', data.checkins_total],
    ['Звонков', data.calls_total],
    ['Тревог (решено)', `${data.emergencies_total} (${data.emergencies_resolved})`],
    ['Платящих родственников', data.paying_relatives],
    ['MRR', `${data.mrr.toLocaleString('ru-RU')} ₽`],
  ];

  return (
    <>
      <h1>Аналитика</h1>
      <div className="stat-grid">
        {ROWS.map(([label, value]) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      {series && (
        <div style={{ marginTop: 16 }}>
          <BarChart title="Заявки за 14 дней" dates={series.dates} values={series.requests} />
          <BarChart title="Check-in события" dates={series.dates} values={series.checkins}
                    color="#2563eb" />
          <BarChart title="Тревожные события" dates={series.dates} values={series.emergencies}
                    color="#c0392b" />
        </div>
      )}
    </>
  );
}
