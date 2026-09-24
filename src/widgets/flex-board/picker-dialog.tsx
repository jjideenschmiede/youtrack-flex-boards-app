import React, {memo, useMemo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import List from '@jetbrains/ring-ui-built/components/list/list';
import {Type as ListItemType, type ListDataItem} from '@jetbrains/ring-ui-built/components/list/consts';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import {visibleColor} from './fields';
import type {PickerRequest} from './types';
import {t} from './i18n';

interface Props {
  request: PickerRequest | null;
  onClose: (value: string | null) => void;
}

const PickerDialogComponent: React.FunctionComponent<Props> = ({request, onClose}) => {
  const items = useMemo<ListDataItem[]>(() => (request?.options ?? []).map(option => {
    const color = visibleColor(option.color)?.background;
    return {
      key: option.value,
      label: option.label,
      className: 'menu__item',
      rgItemType: ListItemType.ITEM,
      leftNodes: color ? <span className="picker__swatch" style={{backgroundColor: color}}/> : undefined
    };
  }), [request]);

  return (
    <Dialog
      show={request !== null}
      label={request?.title ?? ''}
      trapFocus
      autoFocusFirst
      showCloseButton
      closeButtonInside
      contentClassName="picker"
      onCloseAttempt={() => onClose(null)}
    >
      <div className="picker__header">
        <div className="picker__title">{request?.title}</div>
        <div className="picker__issue">
          <span className="picker__issue-id">{request?.issue.idReadable}</span>
          {request?.issue.summary}
        </div>
        {request?.message && <div className="picker__message">{request.message}</div>}
      </div>

      <List
        className="picker__list"
        data={items}
        ariaLabel={request?.title ?? ''}
        activateFirstItem
        shortcuts={request !== null}
        compact={false}
        renderOptimization={false}
        onSelect={item => onClose(item.key ? String(item.key) : null)}
      />

      <Panel className="picker__footer">
        <Button onClick={() => onClose(null)}>{t.cancel}</Button>
      </Panel>
    </Dialog>
  );
};

export const PickerDialog = memo(PickerDialogComponent);
