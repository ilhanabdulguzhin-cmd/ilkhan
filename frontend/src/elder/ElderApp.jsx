import React, { useEffect, useRef, useState } from 'react';
import { api, fmtDate, speak } from '../api.js';

/* Приложение пожилого пользователя v2: один экран — одно действие,
   крупные кнопки, голосовое сопровождение, диалоговый AI с подтверждением,
   напоминания о лекарствах, семейный чат, звонок родным (разделы 6, 23.1 ТЗ). */

const HELP_OPTIONS = [
  { id: 'feeling_bad', icon: '🤒', label: 'Плохо себя чувствую', emergency: true },
  { id: 'household', icon: '🧹', label: 'Нужна помощь дома' },
  { id: 'products', icon: '🛒', label: 'Закончились продукты' },
  { id: 'pharmacy', icon: '💊', label: 'Нужны лекарства' },
  { id: 'lonely', icon: '💬', label: 'Хочу поговорить' },
  { id: 'other', icon: '❓', label: 'Другое' },
];

const FONT_SIZES = ['font-normal', 'font-large', 'font-xlarge'];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export default function ElderApp({ user, onLogout }) {
  const [elder, setElder] = useState(null);
  const [screen, setScreen] = useState('home');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fontIdx, setFontIdx] = useState(
    () => +(localStorage.getItem('vnuchok_font') || 0)
  );

  useEffect(() => {
    api('/users/me')
      .then((me) => setElder(me.elder_profile))
      .catch((e) => setError(e.message));
  }, []);

  const cycleFont = () => {
    const next = (fontIdx + 1) % FONT_SIZES.length;
    setFontIdx(next);
    localStorage.setItem('vnuchok_font', String(next));
  };

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
    <div className={`elder-app ${FONT_SIZES[fontIdx]}`}>
      <header className="elder-header">
        <span className="elder-title">ВнучОК</span>
        <button className="font-toggle" onClick={cycleFont} title="Размер букв">
          A{fontIdx > 0 ? '+'.repeat(fontIdx) : ''}
        </button>
        <span className="elder-name">{elder.full_name.split(' ')[0]}</span>
        <button className="btn link small" onClick={onLogout}>Выйти</button>
      </header>
      {screen === 'home' && <Home {...props} />}
      {screen === 'voice' && <VoiceScreen {...props} />}
      {screen === 'help' && <HelpScreen {...props} />}
      {screen === 'products' && <ProductsScreen {...props} />}
      {screen === 'pharmacy' && <PharmacyScreen {...props} />}
      {screen === 'repeat' && <RepeatScreen {...props} />}
      {screen === 'call' && <CallScreen {...props} />}
      {screen === 'chat' && <ChatScreen {...props} />}
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
  const [meds, setMeds] = useState([]);

  useEffect(() => {
    api(`/medications?elder_id=${elder.id}`)
      .then((items) => setMeds(items.filter((m) => m.is_active)))
      .catch(() => {});
  }, [elder.id]);

  const allGood = async () => {
    try {
      await api('/checkins/ok', { method: 'POST', body: { elder_id: elder.id } });
      setOkPressed(true);
      speak('Спасибо! Мы передали родным, что у вас всё хорошо.');
      setTimeout(() => setOkPressed(false), 4000);
    } catch { /* повторное нажатие не критично */ }
  };

  const markTaken = async (med) => {
    await api(`/medications/${med.id}/taken`, { method: 'POST' });
    speak(`Отметили: ${med.name}. Молодец!`);
    setMeds(meds.map((m) => (m.id === med.id ? { ...m, taken_today: true } : m)));
  };

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const pendingMeds = meds.filter((m) => !m.taken_today);

  return (
    <div className="elder-screen">
      <p className="elder-greeting">{greeting()}! Сегодня {today}.</p>

      <button className="elder-btn ok" onClick={allGood}>
        {okPressed ? '✅ Передали родным!' : '👍 Всё хорошо'}
      </button>

      {pendingMeds.length > 0 && (
        <div className="med-block">
          <p className="med-title">💊 Не забудьте сегодня:</p>
          {pendingMeds.map((m) => (
            <div key={m.id} className="med-item">
              <div>
                <b>{m.name}</b> — {m.times.join(', ')}
                {m.note && <div className="muted med-note">{m.note}</div>}
              </div>
              <button className="btn primary med-btn" onClick={() => markTaken(m)}>
                ✅ Принял
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="elder-grid">
        <button className="elder-btn" onClick={() => setScreen('products')}>
          🛒<span>Продукты</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('pharmacy')}>
          💊<span>Лекарства</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('call')}>
          📞<span>Позвонить</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('repeat')}>
          🔁<span>Повторить заказ</span>
        </button>
        <button className="elder-btn" onClick={() => setScreen('chat')}>
          💬<span>Чат с семьёй</span>
        </button>
        <button className="elder-btn voice" onClick={() => setScreen('voice')}>
          🎤<span>Сказать голосом</span>
        </button>
      </div>
      <button className="elder-btn danger" onClick={() => setScreen('help')}>
        🆘 Мне нужна помощь
      </button>
    </div>
  );
}

function VoiceScreen({ elder, setScreen, done }) {
  const [step, setStep] = useState('listen'); // listen | confirm
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [ai, setAi] = useState(null);
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

  const createRequest = async (confirmedCategory) => {
    try {
      const res = await api('/voice/create-request', {
        method: 'POST',
        body: { elder_id: elder.id, text, confirmed_category: confirmedCategory },
      });
      done(
        res.ai.is_emergency ? 'Мы вас услышали!' : 'Заявка принята!',
        res.ai.clarification
      );
    } catch {
      speak('Не получилось отправить. Попробуйте ещё раз.');
    }
  };

  // Диалоговый сценарий: сначала AI переспрашивает, верно ли понял.
  // Тревожные запросы уходят сразу, без лишнего шага (safety).
  const analyze = async () => {
    if (!text.trim()) return;
    try {
      const result = await api('/voice/classify', {
        method: 'POST',
        body: { elder_id: elder.id, text },
      });
      if (result.is_emergency) {
        await createRequest(null);
        return;
      }
      setAi(result);
      setStep('confirm');
      speak(result.confirm_question);
    } catch {
      speak('Не получилось. Попробуйте ещё раз.');
    }
  };

  if (step === 'confirm' && ai) {
    return (
      <div className="elder-screen center">
        <p className="big-text muted">Вы сказали: «{text}»</p>
        <h2 className="big-text">{ai.confirm_question}</h2>
        <button className="elder-btn ok" onClick={() => createRequest(ai.category)}>
          ✅ Да, верно
        </button>
        {ai.alternatives.map((alt) => (
          <button key={alt.category} className="elder-btn"
                  onClick={() => createRequest(alt.category)}>
            Нет, мне нужно: {alt.label}
          </button>
        ))}
        <button className="elder-btn neutral" onClick={() => {
          setStep('listen'); setText(''); setAi(null);
          speak('Хорошо, скажите ещё раз.');
        }}>
          🎤 Сказать заново
        </button>
      </div>
    );
  }

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
      <button className="elder-btn ok" onClick={analyze} disabled={!text.trim()}>
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

function CallScreen({ elder, setScreen, done }) {
  useEffect(() => { speak('Кому позвонить?'); }, []);

  return (
    <div className="elder-screen">
      <h2 className="big-text center-text">📞 Позвонить</h2>
      {elder.contacts.map((c) => (
        <a key={c.id} className="elder-btn elder-link" href={`tel:${c.phone}`}>
          {c.kind === 'emergency' ? '🆘' : '❤️'} {c.name}
          <small>{c.phone}</small>
        </a>
      ))}
      <button className="elder-btn" onClick={() => {
        api('/requests', {
          method: 'POST',
          body: { elder_id: elder.id, category: 'call', source: 'button' },
        }).then(() => done('Хорошо! Вам перезвонят', 'Оператор наберёт вас в ближайшее время.'));
      }}>
        ☎️ Пусть оператор позвонит мне
      </button>
      <button className="elder-btn" onClick={() => {
        api('/requests', {
          method: 'POST',
          body: { elder_id: elder.id, category: 'family_contact', source: 'button' },
        }).then(() => done('Передали родным!', 'Они увидят, что вы хотите поговорить.'));
      }}>
        👨‍👩‍👧 Передать родным, что скучаю
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Назад</button>
    </div>
  );
}

function ChatScreen({ elder, setScreen }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const reload = () =>
    api(`/chat/${elder.id}/messages`).then(setMessages).catch(() => {});

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 8000);
    return () => clearInterval(timer);
  }, []);

  const send = async () => {
    if (!text.trim()) return;
    await api(`/chat/${elder.id}/messages`, { method: 'POST', body: { text } });
    setText('');
    reload();
  };

  const readAloud = () => {
    const recent = messages.slice(-3)
      .map((m) => `${m.mine ? 'Вы' : m.author_name}: ${m.text}`)
      .join('. ');
    speak(recent || 'Сообщений пока нет.');
  };

  return (
    <div className="elder-screen">
      <h2 className="big-text center-text">💬 Чат с семьёй</h2>
      <button className="elder-btn voice" onClick={readAloud}>
        🔊 Прочитать вслух
      </button>
      <div className="elder-chat">
        {messages.slice(-12).map((m) => (
          <div key={m.id} className={`bubble big ${m.mine ? 'bubble-mine' : ''}`}>
            {!m.mine && <div className="bubble-author">{m.author_name}</div>}
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <p className="muted center-text">Сообщений пока нет.</p>}
      </div>
      <textarea className="input big-input" rows={2} value={text}
                placeholder="Написать родным…"
                onChange={(e) => setText(e.target.value)} />
      <button className="elder-btn ok" onClick={send} disabled={!text.trim()}>
        ➤ Отправить
      </button>
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
        } catch { /* ошибка не критична — оператор увидит дубль */ }
      }}>
        ✅ Да, повторить
      </button>
      <button className="elder-btn neutral" onClick={() => setScreen('home')}>⬅ Нет, назад</button>
    </div>
  );
}
