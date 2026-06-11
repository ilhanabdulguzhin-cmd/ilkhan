import React, { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';

/* Партнёрский кабинет (версия 2 ТЗ): заказы, статусы, комментарии оператору. */

export default function PartnerApp({ user, onLogout }) {
  const [info, setInfo] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');

  const reload = () => api('/partner/orders').then(setOrders).catch(() => {});

  useEffect(() => {
    api('/partner/me').then(setInfo).catch(() => {});
    reload();
    const timer = setInterval(reload, 15000);
    return () => clearInterval(timer);
  }, []);

  const visible = orders.filter((o) =>
    filter === 'active' ? !['done', 'cancelled'].includes(o.status) : true);

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">ВнучОК · Партнёр</span>
        <span className="muted">{info ? info.name : user.full_name}</span>
        <button className="btn link small" onClick={onLogout}>Выйти</button>
      </header>
      <main className="page">
        <div className="tabs">
          <button className={filter === 'active' ? 'tab active' : 'tab'}
                  onClick={() => setFilter('active')}>Активные</button>
          <button className={filter === 'all' ? 'tab active' : 'tab'}
                  onClick={() => setFilter('all')}>Все заказы</button>
        </div>
        {visible.length === 0 && <p className="muted">Заказов нет.</p>}
        {visible.map((o) => (
          <PartnerOrder key={o.id} order={o} onChanged={reload} />
        ))}
      </main>
    </div>
  );
}

function PartnerOrder({ order, onChanged }) {
  const [comment, setComment] = useState('');

  const setStatus = async (status) => {
    await api(`/partner/orders/${order.id}/status`, {
      method: 'POST', body: { status, comment },
    });
    setComment('');
    onChanged();
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    await api(`/partner/orders/${order.id}/comment`, {
      method: 'POST', body: { text: comment },
    });
    setComment('');
  };

  return (
    <div className="card">
      <b>{order.number}</b> · {order.category_label}
      <span className={`pill pill-${order.status}`} style={{ marginLeft: 8 }}>
        {order.status_label}
      </span>
      <p>{order.title}</p>
      {order.description && <p className="muted">{order.description}</p>}
      <div className="info-block">
        📍 {order.address || 'адрес уточнит оператор'}
        {order.elder_phone && <> · 📞 {order.elder_phone}</>}
        {order.access_comment && <div className="muted">Доступ: {order.access_comment}</div>}
      </div>
      <p className="muted small">Создан {fmtDate(order.created_at)}
        {order.cost ? ` · ${order.cost} ₽` : ''}</p>
      <input className="input" placeholder="Комментарий (время доставки, проблемы…)"
             value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="row">
        {order.status === 'sent_to_partner' && (
          <button className="btn primary" onClick={() => setStatus('in_progress')}>
            ✅ Принять в работу
          </button>
        )}
        {order.status === 'in_progress' && (
          <button className="btn primary" onClick={() => setStatus('done')}>
            🏁 Выполнен
          </button>
        )}
        <button className="btn" onClick={sendComment}>💬 Оператору</button>
      </div>
    </div>
  );
}
