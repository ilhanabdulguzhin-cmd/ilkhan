import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getUser, clearSession } from './api.js';
import Login from './pages/Login.jsx';
import ElderApp from './elder/ElderApp.jsx';
import RelativeApp from './relative/RelativeApp.jsx';
import OperatorApp from './operator/OperatorApp.jsx';

export default function App() {
  const [user, setUser] = useState(getUser());

  const logout = () => {
    clearSession();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  if (user.role === 'elder') return <ElderApp user={user} onLogout={logout} />;
  if (user.role === 'operator' || user.role === 'admin')
    return <OperatorApp user={user} onLogout={logout} />;

  return (
    <Routes>
      <Route path="/*" element={<RelativeApp user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
