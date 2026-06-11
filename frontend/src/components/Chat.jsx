import React, { useEffect, useRef, useState } from 'react';
import { api, fmtDate } from '../api.js';

/* Семейный чат — общий компонент для кабинета родственника и оператора. */
export default function Chat({ elderId, big = false }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const reload = () =>
    api(`/chat/${elderId}/messages`).then(setMessages).catch(() => {});

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 8000);
    return () => clearInterval(timer);
  }, [elderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api(`/chat/${elderId}/messages`, { method: 'POST', body: { text } });
    setText('');
    reload();
  };

  return (
    <div className={big ? 'chat chat-big' : 'chat'}>
      <div className="chat-messages">
        {messages.length === 0 && <p className="muted center-text">Сообщений пока нет. Напишите первым!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? 'bubble-mine' : ''} bubble-${m.author_role}`}>
            {!m.mine && <div className="bubble-author">{m.author_name} · {m.author_label}</div>}
            <div>{m.text}</div>
            <div className="bubble-time">{fmtDate(m.created_at)}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <input className="input" value={text} placeholder="Написать сообщение…"
               onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!text.trim()}>➤</button>
      </form>
    </div>
  );
}
