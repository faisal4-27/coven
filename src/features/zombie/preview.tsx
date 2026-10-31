// Mounts Zombie mode alone, so it can be tested without signing in through the shell.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../../index.css';
import { ZombieMode } from './index';

createRoot(document.getElementById('zombie-root')!).render( // the div is in preview.html, so it's always there
  <StrictMode>
    <MemoryRouter>
      <ZombieMode />
    </MemoryRouter>
  </StrictMode>,
);
