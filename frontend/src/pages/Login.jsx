import React, { useState } from 'react';
import { api, setSession } from '../api.js';

const TABS = [
  { id: 'elder', label: 'Я пожилой человек' },
  { id: 'relative', label: 'Я родственник' },
  { id: 'staff', label: 'Сотрудник' },
];

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('elder');
  const [error, setError] = useState('');

  const finish = (data) => {
    setSession(data.access_token, data.user);
    onLogin(data.user);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/icon.svg" alt="" width="64" height="64" />
          <h1>ВнучОК</h1>
          <p className="muted">Забота рядом — каждый день</p>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => { setTab(t.id); setError(''); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <div className="alert error">{error}</div>}
        {tab === 'elder' && <ElderLogin onDone={finish} onError={setError} />}
        {tab === 'relative' && <RelativeLogin onDone={finish} onError={setError} />}
        {tab === 'staff' && <StaffLogin onDone={finish} onError={setError} />}
      </div>
    </div>
  );
}

function ElderLogin({ onDone, onError }) {
  const [code, setCode] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      onDone(await api('/auth/elder-login', { method: 'POST', body: { connect_code: code } }));
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="login-form">
      <p className="big-text">Введите код, который дал вам родственник или оператор:</p>
      <input
        className="input big-input"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Например: DEMO01"
        autoFocus
      />
      <button className="btn primary big" type="submit" disabled={!code.trim()}>
        Войти
      </button>
      <p className="muted">Нет кода? Попросите родственника добавить вас в приложении,
        или позвоните оператору.</p>
    </form>
  );
}

function RelativeLogin({ onDone, onError }) {
  const [mode, setMode] = useState('login'); // login | register | code
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');

  const requestCode = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/auth/request-code', { method: 'POST', body: { phone } });
      setHint(res.demo_code ? `Демо-режим: код ${res.demo_code}` : 'Код отправлен по SMS');
      setMode('code');
      onError('');
    } catch (err) {
      onError(err.message);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: { phone, full_name: name, email, consent_personal_data: consent },
      });
      setHint(res.demo_code ? `Демо-режим: код ${res.demo_code}` : 'Код отправлен по SMS');
      setMode('code');
      onError('');
    } catch (err) {
      onError(err.message);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    try {
      onDone(await api('/auth/verify-code', { method: 'POST', body: { phone, code } }));
    } catch (err) {
      onError(err.message);
    }
  };

  if (mode === 'code') {
    return (
      <form onSubmit={verify} className="login-form">
        {hint && <div className="alert info">{hint}</div>}
        <label>Код из SMS</label>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)}
               placeholder="1234" autoFocus />
        <button className="btn primary" type="submit">Подтвердить</button>
      </form>
    );
  }

  if (mode === 'register') {
    return (
      <form onSubmit={register} className="login-form">
        <label>Телефон</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)}
               placeholder="+7 999 123-45-67" />
        <label>ФИО</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label>E-mail (необязательно)</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="checkbox">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          Согласен на обработку персональных данных
        </label>
        <button className="btn primary" type="submit" disabled={!phone || !name || !consent}>
          Зарегистрироваться
        </button>
        <button className="btn link" type="button" onClick={() => setMode('login')}>
          У меня уже есть аккаунт
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="login-form">
      <label>Телефон</label>
      <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)}
             placeholder="+7 999 123-45-67" autoFocus />
      <button className="btn primary" type="submit" disabled={!phone}>
        Получить код по SMS
      </button>
      <button className="btn link" type="button" onClick={() => setMode('register')}>
        Зарегистрироваться
      </button>
      <p className="muted">Демо-аккаунт: +79991234567, код 1234</p>
    </form>
  );
}

function StaffLogin({ onDone, onError }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      onDone(await api('/auth/login', { method: 'POST', body: { phone, password } }));
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="login-form">
      <label>Телефон</label>
      <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)}
             placeholder="+70000000002" />
      <label>Пароль</label>
      <input className="input" type="password" value={password}
             onChange={(e) => setPassword(e.target.value)} />
      <button className="btn primary" type="submit">Войти</button>
      <p className="muted">Демо: оператор +70000000002 / operator123,
        админ +70000000001 / admin123</p>
    </form>
  );
}
