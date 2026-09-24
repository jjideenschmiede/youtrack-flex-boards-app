import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Select, {type CustomAnchorProps, type SelectItem, Type as SelectType} from '@jetbrains/ring-ui-built/components/select/select';
import {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import chevronDownIcon from '@jetbrains/icons/chevron-12px-down';
import searchIcon from '@jetbrains/icons/search';
import starEmptyIcon from '@jetbrains/icons/star-empty';
import starFilledIcon from '@jetbrains/icons/star-filled';
import {Type as ListItemType} from '@jetbrains/ring-ui-built/components/list/consts';
import updateIcon from '@jetbrains/icons/update';
import type {HostAPI} from '../../../@types/globals';
import {
  errorText,
  loadBaseUrl,
  loadBoards,
  loadCanEdit,
  loadCardFields,
  loadFavoriteBoardIds,
  loadColumnNames,
  loadIssueFields,
  loadSprintIssues,
  saveColumnName,
  saveIssueFields
} from './api';
import {BoardView} from './board-view';
import {t} from './i18n';
import {buildLanes} from './lanes';
import {fieldOf, isEmpty, valueNameOf, valuesOf} from './fields';
import {PickerDialog} from './picker-dialog';
import {RenameDialog, type RenameRequest} from './rename-dialog';
import type {
  Board,
  Column,
  ColumnNames,
  FieldColor,
  FieldValue,
  Issue,
  IssueCustomField,
  IssueFieldDetails,
  Lane,
  PickerOption,
  PickerRequest
} from './types';

interface Props {
  host: HostAPI;
}

interface Answer {
  field: IssueFieldDetails;
  value: string;
}

interface ValueInfo {
  label: string;
  color: FieldColor | null;
}

interface StoredSelection {
  boardId?: string;
  sprintId?: string | null;
}

interface AppStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

const STORAGE_KEY = 'flex-boards';
const DEFAULT_CARD_FIELDS = ['Assignee', 'Type', 'Priority'];

interface LaneChange {
  fieldName: string;
  value: string | null;
}

function storageOf(host: HostAPI): AppStorage | null {
  return (host as HostAPI & {storage?: AppStorage}).storage ?? null;
}

function bundleValuesOf(field: IssueFieldDetails): FieldValue[] {
  return (field.projectCustomField?.bundle?.values ?? []).filter(value => !value.archived);
}

function crumbAnchor(label: string, className: string) {
  return function CrumbAnchor({wrapperProps, buttonProps, popup}: CustomAnchorProps) {
    return (
      <span {...wrapperProps} className="crumb__anchor">
        <button
          type="button"
          id={buttonProps.id}
          disabled={buttonProps.disabled}
          data-test={buttonProps['data-test']}
          onClick={buttonProps.onClick}
          className={className}
        >
          {label}
          <Icon glyph={chevronDownIcon} className="crumb__chevron"/>
        </button>
        {popup}
      </span>
    );
  };
}

function matchesQuery(issue: Issue, query: string): boolean {
  if (!query) {
    return true;
  }
  const needle = query.toLowerCase();
  return issue.idReadable.toLowerCase().includes(needle) || issue.summary.toLowerCase().includes(needle);
}

function laneFieldValue(field: IssueCustomField | null, name: string | null): unknown {
  const multi = Array.isArray(field?.value) || field?.$type.startsWith('Multi') === true;
  if (name === null) {
    return multi ? [] : null;
  }
  const value = field?.$type.includes('User') ? {login: name} : {name};
  return multi ? [value] : value;
}

function sortedColumns(board: Board | null): Column[] {
  return [...(board?.columnSettings?.columns ?? [])].sort((a, b) => a.ordinal - b.ordinal);
}

function openSprints(board: Board | null) {
  return (board?.sprints ?? []).filter(sprint => !sprint.archived);
}

function defaultSprintId(board: Board, preferred?: string | null): string | null {
  const sprints = openSprints(board);
  if (preferred && sprints.some(sprint => sprint.id === preferred)) {
    return preferred;
  }
  return board.currentSprint?.id ?? sprints[0]?.id ?? null;
}

const AppComponent: React.FunctionComponent<Props> = ({host}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [values, setValues] = useState<Record<string, ValueInfo>>({});
  const [columnNames, setColumnNames] = useState<ColumnNames>({});
  const [baseUrl, setBaseUrl] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [cardFieldSetting, setCardFieldSetting] = useState<string[] | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [laneLabels, setLaneLabels] = useState<{field: string; labels: Record<string, string>} | null>(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [rename, setRename] = useState<RenameRequest | null>(null);
  const [renaming, setRenaming] = useState(false);
  const pickerResolver = useRef<((value: string | null) => void) | null>(null);

  const board = useMemo(() => boards.find(candidate => candidate.id === boardId) ?? null, [boards, boardId]);
  const columnField = board?.columnSettings?.field?.name ?? null;
  const columns = useMemo(() => sortedColumns(board), [board]);
  const colorField = board?.colorCoding?.prototype?.name ?? null;
  const estimationField = board?.estimationField?.name ?? null;

  const showError = useCallback((error: unknown, prefix?: string) => {
    const text = errorText(error);
    host.alert(prefix ? `${prefix}: ${text}` : text, AlertType.ERROR);
  }, [host]);

  const labelOf = useCallback((name: string) => values[name]?.label ?? name, [values]);

  const columnOfIssue = useCallback((issue: Issue): Column | null => {
    if (!columnField) {
      return null;
    }
    const value = valueNameOf(issue, columnField);
    return columns.find(column => valuesOf(column).includes(value ?? '')) ?? null;
  }, [columns, columnField]);

  const loadIssues = useCallback(async (target: Board, targetSprintId: string | null) => {
    if (!targetSprintId || !target.columnSettings?.field) {
      setIssues([]);
      return;
    }
    const loaded = await loadSprintIssues(host, target.id, targetSprintId);
    setIssues(loaded);

    const fieldName = target.columnSettings.field.name;
    if (loaded.length > 0) {
      try {
        const fields = await loadIssueFields(host, loaded[0].id);
        const field = fields.find(candidate => candidate.name === fieldName);
        const info: Record<string, ValueInfo> = {};
        (field ? bundleValuesOf(field) : []).forEach(value => {
          if (value.name) {
            info[value.name] = {label: value.localizedName || value.name, color: value.color ?? null};
          }
        });
        setValues(info);
      } catch {
        setValues({});
      }
    }
  }, [host]);

  const reload = useCallback(async () => {
    if (!board) {
      return;
    }
    setLoading(true);
    try {
      await loadIssues(board, sprintId);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [board, sprintId, loadIssues, showError]);

  const selectBoard = useCallback(async (target: Board, preferredSprint?: string | null) => {
    const nextSprint = defaultSprintId(target, preferredSprint);
    setBoardId(target.id);
    setSprintId(nextSprint);
    setIssues([]);
    setValues({});
    setCardFieldSetting(null);
    setCollapsed(new Set());
    setLoading(true);
    try {
      const [names, cardFields, storedCollapsed] = await Promise.all([
        loadColumnNames(host, target.id),
        loadCardFields(host, target.id),
        storageOf(host)?.getItem(`${STORAGE_KEY}:collapsed:${target.id}`).catch(() => null) ?? Promise.resolve(null),
        loadIssues(target, nextSprint)
      ]);
      setColumnNames(names);
      setCardFieldSetting(cardFields);
      try {
        setCollapsed(new Set(storedCollapsed ? JSON.parse(storedCollapsed) as string[] : []));
      } catch {
        setCollapsed(new Set());
      }
      await storageOf(host)?.setItem(STORAGE_KEY, JSON.stringify({boardId: target.id, sprintId: nextSprint}));
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [host, loadIssues, showError]);

  useEffect(() => {
    (async () => {
      try {
        loadCanEdit(host).then(setCanEdit);
        loadFavoriteBoardIds(host).then(setFavorites);
        const [loadedBoards, url] = await Promise.all([loadBoards(host), loadBaseUrl(host)]);
        setBoards(loadedBoards);
        setBaseUrl(url);
        if (loadedBoards.length === 0) {
          setLoading(false);
          return;
        }
        let saved: StoredSelection = {};
        try {
          const raw = await storageOf(host)?.getItem(STORAGE_KEY);
          saved = raw ? JSON.parse(raw) : {};
        } catch {
          saved = {};
        }
        const initial = loadedBoards.find(candidate => candidate.id === saved.boardId) ?? loadedBoards[0];
        await selectBoard(initial, saved.sprintId);
      } catch (error) {
        showError(error);
        setLoading(false);
      }
    })();
  }, [host, selectBoard, showError]);

  const openPicker = useCallback((request: PickerRequest) => new Promise<string | null>(resolve => {
    pickerResolver.current = resolve;
    setPicker(request);
  }), []);

  const closePicker = useCallback((value: string | null) => {
    setPicker(null);
    pickerResolver.current?.(value);
    pickerResolver.current = null;
  }, []);

  const missingFieldOf = useCallback(async (issue: Issue, error: unknown, answered: Answer[]) => {
    const text = errorText(error);
    const fields = await loadIssueFields(host, issue.id);
    const candidates = fields.filter(field =>
      field.name !== columnField &&
      !answered.some(entry => entry.field.name === field.name) &&
      isEmpty(field) &&
      bundleValuesOf(field).length > 0 &&
      text.includes(field.name)
    );
    candidates.sort((a, b) => b.name.length - a.name.length);
    return candidates[0] ?? null;
  }, [host, columnField]);

  const save = useCallback(async (
    issue: Issue,
    valueName: string | null,
    laneChange: LaneChange | null
  ): Promise<boolean> => {
    if (!columnField) {
      return false;
    }
    const answered: Answer[] = [];
    for (;;) {
      const customFields: unknown[] = [];
      if (valueName !== null) {
        customFields.push({
          $type: fieldOf(issue, columnField)?.$type ?? 'StateIssueCustomField',
          name: columnField,
          value: {name: valueName}
        });
      }
      if (laneChange) {
        const laneField = fieldOf(issue, laneChange.fieldName);
        if (laneField) {
          customFields.push({
            $type: laneField.$type,
            name: laneChange.fieldName,
            value: laneFieldValue(laneField, laneChange.value)
          });
        }
      }
      answered.forEach(entry => customFields.push({
        $type: entry.field.$type,
        name: entry.field.name,
        value: Array.isArray(entry.field.value) ? [{name: entry.value}] : {name: entry.value}
      }));
      if (customFields.length === 0) {
        return false;
      }
      try {
        await saveIssueFields(host, issue.id, customFields);
        return true;
      } catch (error) {
        const field = await missingFieldOf(issue, error, answered);
        if (!field) {
          throw error;
        }
        const choice = await openPicker({
          title: t.selectField(field.name),
          message: errorText(error),
          issue,
          options: bundleValuesOf(field).map(value => ({
            value: value.name ?? '',
            label: value.localizedName || value.name || '',
            color: value.color ?? null
          }))
        });
        if (!choice) {
          return false;
        }
        answered.push({field, value: choice});
      }
    }
  }, [host, columnField, missingFieldOf, openPicker]);

  const columnTitle = useCallback((column: Column) =>
    columnNames[column.id] || column.presentation || valuesOf(column).map(labelOf).join(', '),
  [columnNames, labelOf]);

  const layout = useMemo(() => buildLanes(board, issues), [board, issues]);

  const laneFieldName = layout.fieldName;
  const laneSampleId = issues[0]?.id ?? null;
  useEffect(() => {
    if (!laneFieldName || !laneSampleId) {
      return;
    }
    loadIssueFields(host, laneSampleId)
      .then(fields => {
        const field = fields.find(candidate => candidate.name === laneFieldName);
        const labels: Record<string, string> = {};
        (field ? bundleValuesOf(field) : []).forEach(value => {
          if (value.name) {
            labels[value.name] = value.localizedName || value.name;
          }
        });
        setLaneLabels({field: laneFieldName, labels});
      })
      .catch(() => undefined);
  }, [host, laneFieldName, laneSampleId]);

  const lanes = useMemo(() => {
    const labels = laneLabels && laneLabels.field === layout.fieldName ? laneLabels.labels : {};
    return layout.lanes.map(lane =>
      (lane.kind === 'attribute' && lane.value && labels[lane.value] ? {...lane, title: labels[lane.value]} : lane)
    );
  }, [layout, laneLabels]);

  const onDrop = useCallback(async (column: Column, lane: Lane) => {
    const issue = issues.find(candidate => candidate.id === draggedId);
    setDraggedId(null);
    if (!issue || busy || !board) {
      return;
    }
    const columnChanged = columnOfIssue(issue)?.id !== column.id;
    const laneChanged = layout.laneOf(issue) !== lane.key;

    let laneChange: LaneChange | null = null;
    if (laneChanged && layout.fieldName) {
      if (lane.kind === 'issue' || lane.kind === 'orphans' && board.swimlaneSettings?.$type.includes('IssueBased')) {
        host.alert(t.issueLaneMove,
          AlertType.WARNING);
      } else if (lane.kind === 'attribute' || lane.kind === 'orphans') {
        laneChange = {fieldName: layout.fieldName, value: lane.value};
      }
    }
    if (!columnChanged && !laneChange) {
      return;
    }

    let valueName: string | null = null;
    if (columnChanged) {
      const names = valuesOf(column);
      valueName = names.length === 1
        ? names[0]
        : await openPicker({
          title: t.moveTo(columnTitle(column)),
          message: t.selectValueOf(columnField ?? ''),
          issue,
          options: names.map<PickerOption>(name => ({
            value: name,
            label: labelOf(name),
            color: values[name]?.color ?? null
          }))
        });
      if (!valueName) {
        return;
      }
    }

    setBusy(true);
    try {
      if (await save(issue, valueName, laneChange)) {
        await loadIssues(board, sprintId);
      }
    } catch (error) {
      showError(error, issue.idReadable);
    } finally {
      setBusy(false);
    }
  }, [issues, draggedId, busy, board, columnOfIssue, layout, host, openPicker, columnTitle, columnField, labelOf,
    values, save, loadIssues, sprintId, showError]);

  const onRename = useCallback((column: Column) => {
    setRename({
      columnId: column.id,
      defaultName: column.presentation || valuesOf(column).map(labelOf).join(', '),
      currentName: columnNames[column.id] ?? ''
    });
  }, [columnNames, labelOf]);

  const onRenameSave = useCallback(async (name: string) => {
    if (!rename || !board) {
      return;
    }
    setRenaming(true);
    try {
      setColumnNames(await saveColumnName(host, board.id, rename.columnId, name));
      setRename(null);
    } catch (error) {
      showError(error);
    } finally {
      setRenaming(false);
    }
  }, [host, board, rename, showError]);

  const boardItems = useMemo<SelectItem[]>(() => boards.map(candidate => {
    const owner = candidate.owner;
    const mine = owner && YTApp.me?.login === owner.login;
    const favorite = favorites?.has(candidate.id) ?? false;
    return {
      key: candidate.id,
      label: candidate.name,
      className: candidate.id === boardId ? 'menu__item menu__item_selected' : 'menu__item',
      description: mine ? t.me : owner?.fullName || owner?.login || '',
      rightNodes: favorites
        ? <Icon glyph={favorite ? starFilledIcon : starEmptyIcon} className={favorite ? 'star star_active' : 'star'}/>
        : undefined
    };
  }), [boards, favorites, boardId]);

  const boardMenu = useMemo<SelectItem[]>(() => {
    if (!favorites) {
      return boardItems;
    }
    const favored = boardItems.filter(item => favorites.has(String(item.key)));
    const others = boardItems.filter(item => !favorites.has(String(item.key)));
    return favored.length > 0 && others.length > 0
      ? [...favored, {key: 'separator', rgItemType: ListItemType.SEPARATOR}, ...others]
      : boardItems;
  }, [boardItems, favorites]);

  const sprintItems = useMemo<SelectItem[]>(() => openSprints(board).map(sprint => ({
    key: sprint.id,
    label: sprint.name,
    className: sprint.id === sprintId ? 'menu__item menu__item_selected' : 'menu__item'
  })), [board, sprintId]);

  const cells = useMemo(() => {
    const grouped = new Map<string, Issue[]>();
    const perColumn = new Map<string, number>();
    const perLane = new Map<string, number>();
    let placed = 0;
    const visible = layout.cards.filter(issue => matchesQuery(issue, query.trim()));
    visible.forEach(issue => {
      const column = columnOfIssue(issue);
      const laneKey = layout.laneOf(issue);
      if (!column || laneKey === null) {
        return;
      }
      placed++;
      const key = `${laneKey}|${column.id}`;
      grouped.set(key, [...(grouped.get(key) ?? []), issue]);
      perColumn.set(column.id, (perColumn.get(column.id) ?? 0) + 1);
      perLane.set(laneKey, (perLane.get(laneKey) ?? 0) + 1);
    });
    return {grouped, perColumn, perLane, visible: visible.length, hidden: visible.length - placed};
  }, [layout, columnOfIssue, query]);

  const cellIssues = useCallback((laneKey: string, columnId: string) =>
    cells.grouped.get(`${laneKey}|${columnId}`) ?? [], [cells]);
  const columnCount = useCallback((columnId: string) => cells.perColumn.get(columnId) ?? 0, [cells]);
  const laneCount = useCallback((laneKey: string) => cells.perLane.get(laneKey) ?? 0, [cells]);

  const onToggleLane = useCallback((laneKey: string) => {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(laneKey)) {
        next.delete(laneKey);
      } else {
        next.add(laneKey);
      }
      if (board) {
        storageOf(host)?.setItem(`${STORAGE_KEY}:collapsed:${board.id}`, JSON.stringify([...next]))
          .catch(() => undefined);
      }
      return next;
    });
  }, [host, board]);

  const cardFields = useMemo(() => (cardFieldSetting ?? DEFAULT_CARD_FIELDS)
    .filter(name => name !== columnField), [cardFieldSetting, columnField]);

  const labelOfIssue = useCallback((issue: Issue) =>
    (columnField ? labelOf(valueNameOf(issue, columnField) ?? '') : ''),
  [columnField, labelOf]);

  const onDragEnd = useCallback(() => setDraggedId(null), []);
  const onDragStart = useCallback((issue: Issue) => setDraggedId(issue.id), []);

  const showSprints = !board?.sprintsSettings?.disableSprints && sprintItems.length > 1;

  return (
    <div className="app">
      <header className="topbar">
        <nav className="topbar__crumbs" aria-label="Board">
          <span className="crumb crumb_root">{t.appTitle}</span>
          <span className="crumb__separator">{'/'}</span>
          <Select
            type={SelectType.CUSTOM}
            filter
            data={boardMenu}
            minWidth={320}
            selected={boardItems.find(item => item.key === boardId) ?? null}
            customAnchor={crumbAnchor(board?.name ?? t.selectBoard, 'crumb crumb_current')}
            onChange={(item: SelectItem | null) => {
              const target = boards.find(candidate => candidate.id === item?.key);
              if (target) {
                selectBoard(target);
              }
            }}
          />
          {showSprints && (
            <>
              <span className="crumb__separator">{'/'}</span>
              <Select
                type={SelectType.CUSTOM}
                data={sprintItems}
                minWidth={240}
                selected={sprintItems.find(item => item.key === sprintId) ?? null}
                customAnchor={crumbAnchor(
                  sprintItems.find(item => item.key === sprintId)?.label?.toString() ?? t.selectSprint,
                  'crumb crumb_secondary'
                )}
                onChange={(item: SelectItem | null) => {
                  if (!board || !item) {
                    return;
                  }
                  const nextSprint = String(item.key);
                  setSprintId(nextSprint);
                  storageOf(host)?.setItem(STORAGE_KEY, JSON.stringify({boardId: board.id, sprintId: nextSprint}))
                    .catch(() => undefined);
                  setLoading(true);
                  loadIssues(board, nextSprint).catch(showError).finally(() => setLoading(false));
                }}
              />
            </>
          )}
          {(loading || busy) && <LoaderInline className="topbar__loader"/>}
        </nav>

        <div className="topbar__actions">
          <span className="topbar__info">
            {t.cards(cells.visible)}
            {cells.hidden > 0 && `, ${t.notShown(cells.hidden)}`}
          </span>
          <Input
            className="topbar__filter"
            icon={searchIcon}
            placeholder={t.filterPlaceholder}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onClear={() => setQuery('')}
          />
          <Button icon={updateIcon} title={t.reload} disabled={loading || busy} onClick={reload}/>
        </div>
      </header>

      {board && !columnField && (
        <p className="app__empty">{t.noColumnField}</p>
      )}
      {!loading && boards.length === 0 && (
        <p className="app__empty">{t.noBoards}</p>
      )}

      <main className="app__board">
        {columnField && (
          <BoardView
            columns={columns}
            columnTitle={columnTitle}
            valueLabels={column => valuesOf(column).map(labelOf)}
            lanes={lanes}
            cellIssues={cellIssues}
            columnCount={columnCount}
            laneCount={laneCount}
            collapsed={collapsed}
            onToggleLane={onToggleLane}
            onDrop={onDrop}
            onRename={canEdit ? onRename : null}
            card={{
              baseUrl,
              colorField,
              estimationField,
              cardFields,
              labelOfIssue,
              draggedId,
              onDragStart,
              onDragEnd
            }}
          />
        )}
      </main>

      <PickerDialog request={picker} onClose={closePicker}/>
      <RenameDialog key={rename?.columnId ?? 'closed'} request={rename} saving={renaming} onSave={onRenameSave} onClose={() => setRename(null)}/>
    </div>
  );
};

export const App = memo(AppComponent);
