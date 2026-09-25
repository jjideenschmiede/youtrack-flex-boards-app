import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import searchIcon from '@jetbrains/icons/search';
import type {PickerOption, PickerRequest} from './types';
import {t} from './i18n';

interface Props {
  request: PickerRequest | null;
  onClose: (value: string | null) => void;
}

interface PickerState {
  request: PickerRequest | null;
  query: string;
  active: number;
}

const FILTER_THRESHOLD = 5;

function matching(options: PickerOption[], query: string): PickerOption[] {
  const needle = query.trim().toLowerCase();
  return needle ? options.filter(option => option.label.toLowerCase().includes(needle)) : options;
}

function nextIndex(key: string, active: number, count: number): number | null {
  if (key === 'ArrowDown' || key === 'ArrowRight') {
    return (active + 1) % count;
  }
  if (key === 'ArrowUp' || key === 'ArrowLeft') {
    return (active - 1 + count) % count;
  }
  return null;
}

interface RowProps {
  option: PickerOption;
  index: number;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}

const PickerOptionRow: React.FunctionComponent<RowProps> = ({option, index, active, onHover, onPick}) => {
  return (
    <div
      id={`picker-option-${index}`}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      className={active ? 'picker__tile picker__tile_active' : 'picker__tile'}
      onMouseEnter={onHover}
      onClick={onPick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick();
        }
      }}
    >
      {option.label}
    </div>
  );
};

const PickerDialogComponent: React.FunctionComponent<Props> = ({request, onClose}) => {
  const [state, setState] = useState<PickerState>({request: null, query: '', active: 0});
  const current = state.request === request ? state : {request, query: '', active: 0};
  const options = useMemo(() => request?.options ?? [], [request]);
  const visible = useMemo(() => matching(options, current.query), [options, current.query]);
  const active = Math.min(current.active, Math.max(visible.length - 1, 0));
  const showFilter = options.length > FILTER_THRESHOLD;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (request && !showFilter) {
      listRef.current?.focus();
    }
  }, [request, showFilter]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && visible[active]) {
      event.preventDefault();
      onClose(visible[active].value);
      return;
    }
    const next = visible.length > 0 ? nextIndex(event.key, active, visible.length) : null;
    if (next !== null) {
      event.preventDefault();
      setState({...current, active: next});
    }
  };

  return (
    <Dialog
      show={request !== null}
      label={request?.title ?? ''}
      trapFocus
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

      {showFilter && (
        <Input
          className="picker__filter"
          icon={searchIcon}
          placeholder={t.filterOptions}
          value={current.query}
          autoFocus
          onKeyDown={onKeyDown}
          onChange={event => setState({request, query: event.target.value, active: 0})}
          onClear={() => setState({request, query: '', active: 0})}
        />
      )}

      <div
        ref={listRef}
        className="picker__tiles"
        role="listbox"
        aria-label={request?.title ?? ''}
        aria-activedescendant={visible[active] ? `picker-option-${active}` : undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {visible.map((option, index) => (
          <PickerOptionRow
            key={option.value}
            option={option}
            index={index}
            active={index === active}
            onHover={() => setState({...current, active: index})}
            onPick={() => onClose(option.value)}
          />
        ))}
      </div>

      <Panel className="picker__footer">
        <Button onClick={() => onClose(null)}>{t.cancel}</Button>
      </Panel>
    </Dialog>
  );
};

export const PickerDialog = memo(PickerDialogComponent);
