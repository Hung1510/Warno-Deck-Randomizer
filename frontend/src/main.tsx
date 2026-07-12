import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import DivisionsIndex from './pages/DivisionsIndex';
import DivisionPage from './pages/DivisionPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/divisions" element={<DivisionsIndex />} />
        <Route path="/division/:id" element={<DivisionPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);