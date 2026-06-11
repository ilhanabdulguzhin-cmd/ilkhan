import React, { useEffect, useRef, useState } from 'react';
import { api, speak } from '../api.js';

/* Приложение пожилого пользователя: один экран — одно действие,
   крупные кнопки, голосовое сопровождение (раздел 6 и 23.1 ТЗ). */

const HELP_OPTIONS = [
  { id: 'feeling_bad', icon: '🤒', label: 'Плохо себя чувствую', emergency: true },
  { id: 'household', icon: '🧹', label: 'Нужна помощь дома' },
  { id: 'products', icon: '🛒', label: 'Закончились продукты' },
  { id: 'pharmacy', icon: '💊', label: 'Нужны лекарства' },
  { id: 'lonely', icon: '💬', label: 'Хочу поговорить' },
  { id: 'other', icon: '❓', label: 'Другое' },
];

export default function ElderApp({ user, onLogout }) {
  const [elder, setElder] = useState(null);
  const [screen, setScreen] = useState('home');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/users/me')
      .then((me) => setElder(me.elder_profile))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="elder-app"><p className="big-text">{error}</p></div>;
  if (!elder) return <div className="elder-app"><p className="big-text">Загрузка…</p></div>;

  const done = (message, sub = 'Оператор свяжется с вами.') => {
    setResult({ message, sub });
    setScreen('done');
    speak(`${message}. ${sub}`);
  };

  const createRequest = async (category, description = '', priority = 'normal') => {
    try {
      await api('/requests', {
        method: 'POST',
        body: { elder_id: elder.id, category, description, priority, source: 'button' },
      });
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const props = { elder, setScreen, done, createRequest };

  return (
    <div className="elder-app">
      <header className="elder-header">
        <span className="elder-title">ВнучОК</span>
        <span className="elder-name">{elder.full_name.split(' ')[0]}</span>
        <button className="btn link small" onClick={onLogout}>Выйти</button>
      </header>
      {screen === 'home' && <Home {...props} />}
      {screen === 'voice' && <VoiceScreen {...props} />}
      {screen === 'help' && <HelpScreen {...props} />}
      {screen === 'products' && <ProductsScreen {...props} />}
      {screen === 'pharmacy' && <PharmacyScreen {...props} />}
      {screen === 'repeat' && <RepeatScreen {...props} />}
      {screen === 'done' && (
        <div className="elder-screen center">
          <div className="done-icon">✅</div>
          <h2 className="big-text">{result?.message}</h2>
          <p className="big-text muted">{result?.sub}</p>
          <button className="elder-btn neutral" onClick={() => setScreen('home')}>
            ⬅ На главный экран
          </button>
        </div>
      )}
    </div>
  );
}

function Home({ elder, setScreen, done }) {
  const [okPressed, setOkPressed] = useState(false);

  const allGood = async () => {
    try {
      await api('/checkins/ok', { method: 'POST', body: { elder_id: elder.id } });
      setOkPressed(true);
      speak('Спасибо! Мы передали родным, что у вас всё хорошо.');
      setTimeout(() => setOkPressed(false), 4000);
    } catch { /* повторное нажатие не критично */ }
  };

  return (
    <div className="elder-screen">
      <button className="elder-btn ok" onClick={allGood}>
        {okPressed ? '✅ Передали родным!' : '👍 Всё хорошо'}
      </button>
      <div className="elder-grid">
        <button className="elder-btn" onClick={() => setScreen('products')}>
          🛒<span>Продукты</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('pharmacy')}>
          💊<span>Лекарства</span>
        </button>
        <button className="elder-btn" onClick={() => {
          api('/requests', {
            method: 'POST',
            body: { elder_id: elder.id, category: 'call', source: 'button' },
          }).then(() => done('Хорошо! Вам перезвонят'));
        }}>
          📞<span>Позвонить мне</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('repeat')}>
          🔁<span>Повторить заказ</span>
        </button>
      </div>
      <button className="elder-btn danger" onClick={() => setScreen('help')}>
        🆘 Мне нужна помощь
      </button>
      <button className="elder-btn voice" onClick={() => setScreen('voice')}>
        🎤 Сказать голосом
      </button>
    </div>
  );
}

function VoiceScreen({ elder, setScreen, done }) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [supported] = useState(
    () => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  );
  const recognitionRef = useRef(null);

  useEffect(() => {
    speak('Скажите, что вам нужно. Например: закажи продукты.');
    return () => recognitionRef.current?.stop();
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      setText(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const send = async () => {
    if (!text.trim()) return;
    try {
      const res = await api('/voice/create-request', {
        method: 'POST',
        body: { elder_id: elder.id, text },
      });
      done(
        res.ai.is_emergency ? 'Мы вас услышали!' : 'Заявка принята!',
        res.ai.clarification
      );
    } catch (e) {
      speak('Не получилось отправить. Попробуйте ещё раз.');
    }
  };

  return (
    <div className="elder-screen center">
      <h2 className="big-text">Скажите, что нужно</h2>
      {supported ? (
        <button
          className={listening ? 'mic-btn listening' : 'mic-btn'}
          onClick={listening ? () => recognitionRef.current?.stop() : startListening}
        >
          🎤
        </button>
      ) : (
        <p className="muted big-text">Голос недоступен в этом браузере — напишите словами:</p>
      )}
      <textarea
        className="input big-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Например: закажи хлеб и молоко"
      />
      <button className="elder-btn ok" onClick={send} disabled={!text.trim()}>
        ✅ Отправить
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
    </div>
  );
}

function HelpScreen({ elder, setScreen, done, createRequest }) {
  useEffect(() => { speak('Что случилось? Выберите вариант.'); }, []);

  const choose = async (option) => {
    const ok = await createRequest(
      option.id === 'feeling_bad' ? 'feeling_bad'
        : option.id === 'lonely' ? 'lonely'
        : option.id,
      option.label,
      option.emergency ? 'critical' : 'high'
    );
    if (!ok) return;
    if (option.emergency) {
      done('Помощь уже в пути!', 'Оператор срочно звонит вам. Родные предупреждены.');
    } else {
      done('Заявка принята!');
    }
  };

  return (
    <div className="elder-screen">
      <h2 className="big-text center-text">Что случилось?</h2>
      {HELP_OPTIONS.map((option) => (
        <button
          key={option.id}
          className={option.emergency ? 'elder-btn danger' : 'elder-btn'}
          onClick={() => choose(option)}
        >
          {option.icon} {option.label}
        </button>
      ))}
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
    </div>
  );
}

function ProductsScreen({ elder, setScreen, done, createRequest }) {
  const [sets, setSets] = useState([]);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api('/requests/product-sets').then(setSets).catch(() => {});
    speak('Выберите продуктовый набор.');
  }, []);

  if (confirm) {
    return (
      <div className="elder-screen center">
        <h2 className="big-text">Заказать «{confirm.title}» за {confirm.price} ₽?</h2>
        <button className="elder-btn ok" onClick={async () => {
          const ok = await createRequest('products',
            `Продуктовый набор: ${confirm.title} (${confirm.price} ₽)`);
          if (ok) done('Продукты заказаны!');
        }}>
          ✅ Да, заказать
        </button>
        <button className="elder-btn neutral" onClick={() => setConfirm(null)}>⬅ Нет, назад</button>
      </div>
    );
  }

  return (
    <div className="elder-screen">
      <h2 className="big-text center-text">🛒 Продукты</h2>
      {sets.map((s) => (
        <button key={s.code} className="elder-btn" onClick={() => setConfirm(s)}>
          {s.title} — {s.price} ₽
        </button>
      ))}
      <button className="elder-btn voice" onClick={() => setScreen('voice')}>
        🎤 Сказать голосом, что нужно
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
    </div>
  );
}

function PharmacyScreen({ elder, setScreen, done, createRequest }) {
  useEffect(() => { speak('Что нужно из аптеки?'); }, []);
  const regular = elder.regular_pharmacy_items;

  return (
    <div className="elder-screen">
      <h2 className="big-text center-text">💊 Аптека</h2>
      {regular && (
        <button className="elder-btn" onClick={async () => {
          const ok = await createRequest('pharmacy', `Регулярный аптечный заказ: ${regular}`);
          if (ok) done('Аптечная заявка принята!');
        }}>
          🔁 Мои обычные товары:<br /><small>{regular}</small>
        </button>
      )}
      <button className="elder-btn voice" onClick={() => setScreen('voice')}>
        🎤 Сказать голосом, что нужно
      </button>
      <button className="elder-btn" onClick={async () => {
        const ok = await createRequest('pharmacy', 'Просьба позвонить и уточнить аптечный заказ');
        if (ok) done('Оператор позвонит вам!', 'Он уточнит, что нужно из аптеки.');
      }}>
        📞 Пусть оператор позвонит и спросит
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
    </div>
  );
}

function RepeatScreen({ elder, setScreen, done }) {
  const [last, setLast] = useState(undefined);

  useEffect(() => {
    api(`/requests?elder_id=${elder.id}`)
      .then((items) => {
        const order = items.find((r) => r.category === 'products' || r.category === 'pharmacy');
        setLast(order || null);
        speak(order
          ? `Повторить прошлый заказ: ${order.title}?`
          : 'Прошлых заказов пока нет.');
      })
      .catch(() => setLast(null));
  }, []);

  if (last === undefined) return <div className="elder-screen center"><p className="big-text">Ищем прошлый заказ…</p></div>;
  if (last === null) {
    return (
      <div className="elder-screen center">
        <p className="big-text">Прошлых заказов пока нет.</p>
        <button className="elder-btn" onClick={() => setScreen('products')}>🛒 Заказать продукты</button>
        <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
      </div>
    );
  }

  return (
    <div className="elder-screen center">
      <h2 className="big-text">Повторить прошлый заказ?</h2>
      <p className="big-text muted">{last.title}</p>
      <button className="elder-btn ok" onClick={async () => {
        try {
          await api('/requests/repeat-last', { method: 'POST', body: { elder_id: elder.id } });
          done('Заказ повторён!');
        } catch { /* ошибка озвучена done-экраном не будет */ }
      }}>
        ✅ Да, повторить
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Нет, назад</button>
    </div>
  );
}
