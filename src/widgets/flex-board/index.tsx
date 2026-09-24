import React from 'react';
import ReactDOM from 'react-dom/client';
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';
import Theme, {ThemeProvider} from '@jetbrains/ring-ui-built/components/global/theme';
import '@jetbrains/ring-ui-built/components/style.css';
import type {HostAPI} from '../../../@types/globals';
import {App} from './app';

const host = await YTApp.register() as HostAPI;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={Theme.AUTO} passToPopups className="theme-root">
      <ControlsHeightContext.Provider value={ControlsHeight.S}>
        <App host={host}/>
      </ControlsHeightContext.Provider>
    </ThemeProvider>
  </React.StrictMode>
);
