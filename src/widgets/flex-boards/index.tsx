import React, {forwardRef} from 'react';
import ReactDOM from 'react-dom/client';
import {ControlsHeight, ControlsHeightContext} from '@jetbrains/ring-ui-built/components/global/controls-height';
import Theme, {ThemeProvider} from '@jetbrains/ring-ui-built/components/global/theme';
import '@jetbrains/ring-ui-built/components/style.css';
import type {HostAPI} from '../../../@types/globals';
import {App} from './app';

const host = await YTApp.register() as HostAPI;

const ThemeRoot = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(function ThemeRoot(props, ref) {
  return <div {...props} ref={ref as React.Ref<HTMLDivElement>} className="theme-root"/>;
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={Theme.AUTO} passToPopups target={document.body} WrapperComponent={ThemeRoot}>
      <ControlsHeightContext.Provider value={ControlsHeight.S}>
        <App host={host}/>
      </ControlsHeightContext.Provider>
    </ThemeProvider>
  </React.StrictMode>
);
