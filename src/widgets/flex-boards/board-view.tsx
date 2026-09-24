import React, {memo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import chevronDownIcon from '@jetbrains/icons/chevron-down';
import chevronRightIcon from '@jetbrains/icons/chevron-right';
import pencilIcon from '@jetbrains/icons/pencil';
import {issueUrl, openIssue} from './fields';
import {IssueCard} from './issue-card';
import type {Column, Issue, Lane} from './types';
import {t} from './i18n';

interface CardOptions {
  baseUrl: string;
  colorField: string | null;
  estimationField: string | null;
  cardFields: string[];
  labelOfIssue: (issue: Issue) => string;
  draggedId: string | null;
  onDragStart: (issue: Issue) => void;
  onDragEnd: () => void;
}

interface Props {
  columns: Column[];
  columnTitle: (column: Column) => string;
  valueLabels: (column: Column) => string[];
  lanes: Lane[];
  cellIssues: (laneKey: string, columnId: string) => Issue[];
  columnCount: (columnId: string) => number;
  laneCount: (laneKey: string) => number;
  collapsed: ReadonlySet<string>;
  onToggleLane: (laneKey: string) => void;
  onDrop: (column: Column, lane: Lane) => void;
  onRename: ((column: Column) => void) | null;
  card: CardOptions;
}

interface CellProps {
  column: Column;
  lane: Lane;
  issues: Issue[];
  showState: boolean;
  gridColumn: number;
  gridRow: number;
  onDrop: (column: Column, lane: Lane) => void;
  card: CardOptions;
}

const Cell: React.FunctionComponent<CellProps> = ({column, lane, issues, showState, gridColumn, gridRow, onDrop, card}) => {
  const [isTarget, setIsTarget] = useState(false);

  return (
    <div
      className={isTarget ? 'cell cell_target' : 'cell'}
      style={{gridColumn, gridRow}}
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsTarget(true);
      }}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsTarget(false);
        }
      }}
      onDrop={event => {
        event.preventDefault();
        setIsTarget(false);
        onDrop(column, lane);
      }}
    >
      {issues.map(issue => (
        <IssueCard
          key={issue.id}
          issue={issue}
          baseUrl={card.baseUrl}
          colorField={card.colorField}
          estimationField={card.estimationField}
          cardFields={card.cardFields}
          stateLabel={showState ? card.labelOfIssue(issue) : ''}
          dragging={card.draggedId === issue.id}
          onDragStart={card.onDragStart}
          onDragEnd={card.onDragEnd}
        />
      ))}
    </div>
  );
};

const BoardViewComponent: React.FunctionComponent<Props> = ({
  columns,
  columnTitle,
  valueLabels,
  lanes,
  cellIssues,
  columnCount,
  laneCount,
  collapsed,
  onToggleLane,
  onDrop,
  onRename,
  card
}) => {
  const single = lanes.length === 1 && lanes[0].kind === 'none';

  const rows: string[] = ['auto'];
  const placements = lanes.map(lane => {
    const isCollapsed = !single && collapsed.has(lane.key);
    const headerRow = single ? null : rows.push('auto');
    const cellsRow = isCollapsed ? null : rows.push(single ? '1fr' : 'auto');
    return {lane, isCollapsed, headerRow, cellsRow};
  });

  const style = {
    '--columns': columns.length,
    gridTemplateRows: rows.join(' ')
  } as React.CSSProperties;

  return (
    <div className="board" style={style}>
      {columns.map((column, index) => (
        <div key={`band-${column.id}`} className="board__band" style={{gridColumn: index + 1, gridRow: '1 / -1'}}/>
      ))}

      {columns.map((column, index) => {
        const labels = valueLabels(column);
        const count = columnCount(column.id);
        const max = column.wipLimit?.max ?? null;
        return (
          <div key={`head-${column.id}`} className="column-head" style={{gridColumn: index + 1, gridRow: 1}}>
            <div className="column-head__line">
              <Tooltip title={labels.length > 1 ? labels.join(', ') : null}>
                <span className="column-head__title">{columnTitle(column)}</span>
              </Tooltip>
              <span className={max !== null && count > max ? 'column-head__count column-head__count_over' : 'column-head__count'}>
                {max !== null ? `${count} / ${max}` : count}
              </span>
              {onRename && (
                <Button
                  className="column-head__rename"
                  icon={pencilIcon}
                  title={t.renameColumn}
                  onClick={() => onRename(column)}
                />
              )}
            </div>
            {labels.length > 1 && <div className="column-head__values">{labels.join(' · ')}</div>}
          </div>
        );
      })}

      {placements.map(({lane, isCollapsed, headerRow, cellsRow}) => (
        <React.Fragment key={lane.key}>
          {headerRow !== null && (
            <header className="lane" style={{gridColumn: '1 / -1', gridRow: headerRow}}>
              <Button
                icon={isCollapsed ? chevronRightIcon : chevronDownIcon}
                title={isCollapsed ? t.expandSwimlane : t.collapseSwimlane}
                onClick={() => onToggleLane(lane.key)}
              />
              {lane.issue && (
                <a
                  className={lane.issue.resolved ? 'lane__id lane__id_resolved' : 'lane__id'}
                  href={issueUrl(card.baseUrl, lane.issue.idReadable)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={event => {
                    event.preventDefault();
                    if (lane.issue) {
                      openIssue(card.baseUrl, lane.issue.idReadable);
                    }
                  }}
                >
                  {lane.issue.idReadable}
                </a>
              )}
              <span className={lane.kind === 'orphans' ? 'lane__title lane__title_muted' : 'lane__title'}>
                {lane.title}
              </span>
              <span className="lane__count">{laneCount(lane.key)}</span>
            </header>
          )}
          {cellsRow !== null && columns.map((column, index) => (
            <Cell
              key={`${lane.key}-${column.id}`}
              column={column}
              lane={lane}
              issues={cellIssues(lane.key, column.id)}
              showState={column.fieldValues.length > 1}
              gridColumn={index + 1}
              gridRow={cellsRow}
              onDrop={onDrop}
              card={card}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export const BoardView = memo(BoardViewComponent);
