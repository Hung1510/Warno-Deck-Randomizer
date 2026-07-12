import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import DivisionsIndex from './pages/DivisionsIndex';
import DivisionPage from './pages/DivisionPage';
import UnitSearchPage from './pages/UnitSearchPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/divisions" element={<DivisionsIndex />} />
        <Route path="/division/:id" element={<DivisionPage />} />
        <Route path="/units" element={<UnitSearchPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);