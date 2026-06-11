import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';

/* Кабинет родственника (раздел 7 ТЗ): главный экран отвечает на вопрос
   «Всё ли в порядке?», лента событий, заказы, подписка, уведомления. */

const NAV = [
  { id: 'home', icon: '🏠', label: 'Главная' },
  { id: 'orders', icon: '📋', label: 'Заявки' },
  { id: 'profile', icon: '👤', label: 'Профиль' },
  { id: 'subscription', icon: '💳', label: 'Тариф' },
  { id: 'alerts', icon: '🔔', label: 'События' },
];

const STATUS_COLORS = {
  ok: 'status-ok', attention: 'status-warn', no_contact: 'status-warn', alarm: 'status-alarm',
};

export default function RelativeApp({ user, onLogout }) {
  const [page, setPage] = useState('home');
  const [elders, setElders] = useState(null);
  const [elder, setElder] = useState(null);
  const [unread, setUnread] = useState(0);

  const loadElders = () =>
    api('/users/elders').then((items) => {
      setElders(items);
      setElder((current) => items.find((e) => e.id === current?.id) || items[0] || null);
    });

  useEffect(() => {
    loadElders();
    const poll = () => api('/notifications?unread_only=true')
      .then((r) => setUnread(r.unread_count)).catch(() => {});
    poll();
    const timer = setInterval(poll, 15000);
    return () => clearInterval(timer);
  }, []);

  if (elders === null) return <div className="page center"><p>Загрузка…</p></div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">ВнучОК</span>
        <span className="muted">{user.full_name}</span>
        <button className="btn link small" onClick={onLogout}>Выйти</button>
      </header>

      <main className="page">
        {elders.length === 0 || page === 'add' ? (
          <AddElder onCreated={() => { loadElders(); setPage('home'); }}
                    canCancel={elders.length > 0} onCancel={() => setPage('home')} />
        ) : (
          <>
            {elders.length > 1 && (
              <select className="input" value={elder?.id}
                      onChange={(e) => setElder(elders.find((x) => x.id === +e.target.value))}>
                {elders.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            )}
            {page === 'home' && elder && (
              <Dashboard elder={elder} onAdd={() => setPage('add')} onOrders={() => setPage('orders')} />
            )}
            {page === 'orders' && elder && <Orders elder={elder} />}
            {page === 'profile' && elder && <Profile elder={elder} onSaved={loadElders} />}
            {page === 'subscription' && <SubscriptionPage />}
            {page === 'alerts' && <Notifications onRead={() => setUnread(0)} />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button key={item.id}
                  className={page === item.id ? 'nav-item active' : 'nav-item'}
                  onClick={() => setPage(item.id)}>
            <span className="nav-icon">
              {item.icon}
              {item.id === 'alerts' && unread > 0 && <span className="badge-dot">{unread}</span>}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function AddElder({ onCreated, canCancel, onCancel }) {
  const [form, setForm] = useState({
    full_name: '', age: '', phone: '', address: '', mobility_limits: '',
    food_preferences: '', regular_pharmacy_items: '', relation_type: 'родственник',
  });
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const elder = await api('/users/elder', {
        method: 'POST',
        body: { ...form, age: form.age ? +form.age : null },
      });
      setCreated(elder);
    } catch (err) {
      setError(err.message);
    }
  };

  if (created) {
    return (
      <div className="card center-text">
        <h2>Профиль создан! 🎉</h2>
        <p>Код подключения для приложения вашего близкого:</p>
        <div className="connect-code">{created.connect_code}</div>
        <p className="muted">Введите этот код на устройстве пожилого человека во вкладке
          «Я пожилой человек», или сообщите оператору — он поможет подключить.</p>
        <button className="btn primary" onClick={onCreated}>Перейти в кабинет</button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Добавить близкого человека</h2>
      {error && <div className="alert error">{error}</div>}
      <label>ФИО *</label>
      <input className="input" value={form.full_name} onChange={set('full_name')} required />
      <div className="row">
        <div><label>Возраст</label>
          <input className="input" type="number" value={form.age} onChange={set('age')} /></div>
        <div><label>Телефон</label>
          <input className="input" value={form.phone} onChange={set('phone')} /></div>
      </div>
      <label>Адрес</label>
      <input className="input" value={form.address} onChange={set('address')} />
      <label>Ограничения по мобильности</label>
      <input className="input" value={form.mobility_limits} onChange={set('mobility_limits')} />
      <label>Предпочтения по продуктам</label>
      <input className="input" value={form.food_preferences} onChange={set('food_preferences')} />
      <label>Регулярные аптечные товары</label>
      <input className="input" value={form.regular_pharmacy_items}
             onChange={set('regular_pharmacy_items')} />
      <label>Кем вы приходитесь</label>
      <input className="input" value={form.relation_type} onChange={set('relation_type')} />
      <button className="btn primary" type="submit">Создать профиль</button>
      {canCancel && <button className="btn link" type="button" onClick={onCancel}>Отмена</button>}
    </form>
  );
}

function Dashboard({ elder, onAdd, onOrders }) {
  const [feed, setFeed] = useState([]);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');

  const reload = () => {
    api(`/admin/activity?elder_id=${elder.id}`).then(setFeed).catch(() => {});
    api(`/requests?elder_id=${elder.id}`).then(setRequests).catch(() => {});
  };
  useEffect(reload, [elder.id]);

  const activity = elder.activity || {};
  const active = requests.filter((r) => !['done', 'cancelled'].includes(r.status));

  const quick = async (category, title) => {
    await api('/requests', {
      method: 'POST',
      body: { elder_id: elder.id, category, title, source: 'relative' },
    });
    setMessage(`Заявка «${title}» создана. Оператор взял её в работу.`);
    setTimeout(() => setMessage(''), 5000);
    reload();
  };

  return (
    <>
      <div className={`card status-card ${STATUS_COLORS[activity.status] || ''}`}>
        <h2>{elder.full_name}</h2>
        <div className="status-line">
          {activity.status === 'ok' && '🟢'}
          {(activity.status === 'attention' || activity.status === 'no_contact') && '🟡'}
          {activity.status === 'alarm' && '🔴'}
          {' '}{activity.label || '—'}
        </div>
        <p className="muted">Последний контакт: {fmtDate(activity.last_checkin_at)}</p>
        <p className="muted">Код подключения приложения: <b>{elder.connect_code}</b></p>
      </div>

      {message && <div className="alert info">{message}</div>}

      <div className="card">
        <h3>Быстрые действия</h3>
        <div className="quick-grid">
          <button className="btn quick" onClick={() => quick('products', 'Заказ продуктов')}>🛒 Продукты</button>
          <button className="btn quick" onClick={() => quick('pharmacy', 'Аптечный заказ')}>💊 Аптека</button>
          <button className="btn quick" onClick={() => quick('call', 'Звонок оператора')}>📞 Заказать звонок</button>
          <button className="btn quick" onClick={() => quick('household', 'Помощь по дому')}>🧹 Помощь по дому</button>
        </div>
        <button className="btn link" onClick={onAdd}>+ Добавить ещё одного близкого</button>
      </div>

      {active.length > 0 && (
        <div className="card">
          <h3>Активные заявки ({active.length})</h3>
          {active.slice(0, 5).map((r) => (
            <div key={r.id} className="feed-item">
              <b>{r.title}</b>
              <span className={`pill pill-${r.status}`}>{r.status_label}</span>
              <span className="muted small">{fmtDate(r.created_at)}</span>
            </div>
          ))}
          <button className="btn link" onClick={onOrders}>Все заявки →</button>
        </div>
      )}

      <div className="card">
        <h3>История активности</h3>
        {feed.length === 0 && <p className="muted">Пока событий нет.</p>}
        {feed.slice(0, 15).map((event, i) => (
          <div key={i} className={`feed-item ${event.type === 'emergency' ? 'feed-alarm' : ''}`}>
            <b>{event.title}</b>
            {event.body && <span className="muted">{event.body}</span>}
            <span className="muted small">{fmtDate(event.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Orders({ elder }) {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);

  const reload = () => api(`/requests?elder_id=${elder.id}`).then(setRequests).catch(() => {});
  useEffect(reload, [elder.id]);

  if (selected) {
    return <OrderDetail id={selected} onBack={() => { setSelected(null); reload(); }} />;
  }

  return (
    <div className="card">
      <h2>Заявки и заказы</h2>
      {requests.length === 0 && <p className="muted">Заявок пока нет.</p>}
      {requests.map((r) => (
        <button key={r.id} className="list-row" onClick={() => setSelected(r.id)}>
          <span><b>{r.number}</b> · {r.category_label}</span>
          <span>{r.title}</span>
          <span className={`pill pill-${r.status}`}>{r.status_label}</span>
          <span className="muted small">{fmtDate(r.created_at)}{r.cost ? ` · ${r.cost} ₽` : ''}</span>
        </button>
      ))}
    </div>
  );
}

function OrderDetail({ id, onBack }) {
  const [req, setReq] = useState(null);

  useEffect(() => { api(`/requests/${id}`).then(setReq).catch(() => {}); }, [id]);
  if (!req) return <p>Загрузка…</p>;

  const cancellable = !['done', 'cancelled'].includes(req.status);

  return (
    <div className="card">
      <button className="btn link" onClick={onBack}>← Назад к списку</button>
      <h2>{req.number}: {req.title}</h2>
      <p><span className={`pill pill-${req.status}`}>{req.status_label}</span></p>
      <p className="muted">{req.category_label} · создана {fmtDate(req.created_at)}
        {req.cost ? ` · ${req.cost} ₽` : ''}</p>
      {req.description && <p>{req.description}</p>}
      {req.operator_name && <p className="muted">Оператор: {req.operator_name}</p>}
      {req.partner_name && <p className="muted">Партнёр: {req.partner_name}</p>}

      <h3>История статусов</h3>
      {req.status_history.map((h, i) => (
        <div key={i} className="feed-item">
          <b>{h.status_label}</b>
          {h.comment && <span className="muted">{h.comment}</span>}
          <span className="muted small">{fmtDate(h.created_at)}{h.changed_by ? ` · ${h.changed_by}` : ''}</span>
        </div>
      ))}

      {req.comments.length > 0 && (
        <>
          <h3>Комментарии</h3>
          {req.comments.map((c) => (
            <div key={c.id} className="feed-item">
              <b>{c.author || 'Оператор'}</b>
              <span>{c.text}</span>
              <span className="muted small">{fmtDate(c.created_at)}</span>
            </div>
          ))}
        </>
      )}

      {cancellable && (
        <button className="btn danger" onClick={async () => {
          await api(`/requests/${req.id}`, { method: 'PATCH', body: { status: 'cancelled' } });
          onBack();
        }}>
          Отменить заявку
        </button>
      )}
    </div>
  );
}

function Profile({ elder, onSaved }) {
  const [form, setForm] = useState({ ...elder });
  const [contact, setContact] = useState({ name: '', phone: '', kind: 'trusted' });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const FIELDS = [
    ['full_name', 'ФИО'], ['phone', 'Телефон'], ['address', 'Адрес'],
    ['access_comment', 'Как попасть в квартиру (домофон, этаж)'],
    ['mobility_limits', 'Ограничения по мобильности'],
    ['food_preferences', 'Предпочтения по продуктам'],
    ['food_restrictions', 'Нежелательные продукты'],
    ['regular_pharmacy_items', 'Регулярные аптечные товары'],
    ['preferred_call_time', 'Удобное время звонков'],
  ];

  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(FIELDS.map(([k]) => [k, form[k] || '']));
    await api(`/users/elder/${elder.id}`, { method: 'PATCH', body });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onSaved();
  };

  const addContact = async () => {
    if (!contact.name || !contact.phone) return;
    await api(`/users/elder/${elder.id}/contacts`, { method: 'POST', body: contact });
    setContact({ name: '', phone: '', kind: 'trusted' });
    onSaved();
  };

  return (
    <form className="card" onSubmit={save}>
      <h2>Профиль: {elder.full_name}</h2>
      {saved && <div className="alert info">Сохранено</div>}
      {FIELDS.map(([key, label]) => (
        <React.Fragment key={key}>
          <label>{label}</label>
          <input className="input" value={form[key] || ''} onChange={set(key)} />
        </React.Fragment>
      ))}
      <button className="btn primary" type="submit">Сохранить</button>

      <h3>Доверенные и экстренные контакты</h3>
      {elder.contacts.map((c) => (
        <div key={c.id} className="feed-item">
          <b>{c.name}</b> <span>{c.phone}</span>
          <span className="muted small">{c.kind === 'emergency' ? 'Экстренный' : 'Доверенный'}</span>
        </div>
      ))}
      <div className="row">
        <input className="input" placeholder="Имя" value={contact.name}
               onChange={(e) => setContact({ ...contact, name: e.target.value })} />
        <input className="input" placeholder="Телефон" value={contact.phone}
               onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
      </div>
      <select className="input" value={contact.kind}
              onChange={(e) => setContact({ ...contact, kind: e.target.value })}>
        <option value="trusted">Доверенный контакт</option>
        <option value="emergency">Экстренный контакт</option>
      </select>
      <button className="btn" type="button" onClick={addContact}>+ Добавить контакт</button>
    </form>
  );
}

function SubscriptionPage() {
  const [tariffs, setTariffs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState('');

  const reload = () => {
    api('/tariffs').then((t) => setTariffs(t.filter((x) => x.code !== 'social')));
    api('/subscriptions/my').then(setCurrent).catch(() => {});
    api('/payments/history').then(setPayments).catch(() => {});
  };
  useEffect(reload, []);

  const subscribe = async (plan) => {
    await api('/subscriptions/create', { method: 'POST', body: { plan } });
    setMessage('Подписка оформлена, оплата прошла успешно!');
    reload();
  };

  return (
    <>
      {message && <div className="alert info">{message}</div>}
      {current && (
        <div className="card">
          <h3>Текущий тариф: «{current.plan_title}»</h3>
          <p className="muted">Действует до {fmtDate(current.expires_at)} ·
            автопродление {current.auto_renew ? 'включено' : 'выключено'}</p>
          <button className="btn link" onClick={async () => {
            await api('/subscriptions/cancel', { method: 'POST' });
            reload();
          }}>Отключить подписку</button>
        </div>
      )}
      <div className="tariff-grid">
        {tariffs.map((t) => (
          <div key={t.code} className={`card tariff ${current?.plan === t.code ? 'tariff-active' : ''}`}>
            <h3>{t.title}</h3>
            <div className="price">{t.price} ₽<span className="muted">/мес</span></div>
            <ul>{t.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
            <button className="btn primary" disabled={current?.plan === t.code}
                    onClick={() => subscribe(t.code)}>
              {current?.plan === t.code ? 'Подключён' : 'Выбрать'}
            </button>
          </div>
        ))}
      </div>
      {payments.length > 0 && (
        <div className="card">
          <h3>История платежей</h3>
          {payments.map((p) => (
            <div key={p.id} className="feed-item">
              <b>{p.amount} ₽ — {p.description}</b>
              <span className="muted small">Чек {p.receipt_number} · {fmtDate(p.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Notifications({ onRead }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('/notifications').then((r) => setItems(r.items));
    api('/notifications/read-all', { method: 'POST' }).then(onRead).catch(() => {});
  }, []);

  return (
    <div className="card">
      <h2>Уведомления</h2>
      {items.length === 0 && <p className="muted">Уведомлений пока нет.</p>}
      {items.map((n) => (
        <div key={n.id} className={`feed-item ${n.kind === 'emergency' ? 'feed-alarm' : ''}`}>
          <b>{n.title}</b>
          {n.body && <span className="muted">{n.body}</span>}
          <span className="muted small">{fmtDate(n.created_at)}</span>
        </div>
      ))}
    </div>
  );
}
