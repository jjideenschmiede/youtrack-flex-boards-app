import React, {memo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import {Content, Header} from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import {t} from './i18n';

export interface RenameRequest {
  columnId: string;
  defaultName: string;
  currentName: string;
}

interface Props {
  request: RenameRequest | null;
  saving: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}

const RenameDialogComponent: React.FunctionComponent<Props> = ({request, saving, onSave, onClose}) => {
  const [name, setName] = useState(request?.currentName ?? '');

  return (
    <Dialog
      show={request !== null}
      label={t.renameColumn}
      trapFocus
      autoFocusFirst
      showCloseButton
      onCloseAttempt={onClose}
    >
      <Header>{t.renameColumn}</Header>
      <Content>
        <div className="rename__form">
          <Input
            label={t.columnName}
            placeholder={request?.defaultName}
            value={name}
            onChange={event => setName(event.target.value)}
            onClear={() => setName('')}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                onSave(name);
              }
            }}
          />
          <p className="rename__hint">
            {t.renameHint(request?.defaultName ?? '')}
          </p>
        </div>
      </Content>
      <Panel>
        <Button primary disabled={saving} onClick={() => onSave(name)}>{t.save}</Button>
        <Button disabled={saving} onClick={() => onSave('')}>{t.resetToDefault}</Button>
        <Button disabled={saving} onClick={onClose}>{t.cancel}</Button>
      </Panel>
    </Dialog>
  );
};

export const RenameDialog = memo(RenameDialogComponent);
