import {fieldOf, valueLabel} from './fields';
import type {Board, FieldValue, Issue, Lane} from './types';
import {t} from './i18n';

export const ALL_LANE = 'all';
export const ORPHANS_LANE = 'orphans';

export interface LaneLayout {
  lanes: Lane[];
  cards: Issue[];
  laneOf: (issue: Issue) => string | null;
  fieldName: string | null;
}

function matches(value: FieldValue, name: string): boolean {
  return value.name === name || value.login === name || value.fullName === name;
}

function resolveFieldName(issues: Issue[], name: string, presentation: string | null, valueNames: string[]): string | null {
  const candidates = [name, presentation].filter((value): value is string => Boolean(value)).map(value => value.toLowerCase());
  for (const issue of issues) {
    const field = issue.customFields.find(candidate => candidates.includes(candidate.name.toLowerCase()));
    if (field) {
      return field.name;
    }
  }

  const hits = new Map<string, number>();
  issues.forEach(issue => issue.customFields.forEach(field => {
    const values = fieldValues(issue, field.name);
    if (values.some(value => valueNames.some(valueName => matches(value, valueName)))) {
      hits.set(field.name, (hits.get(field.name) ?? 0) + 1);
    }
  }));
  let best: string | null = null;
  hits.forEach((count, fieldName) => {
    if (best === null || count > (hits.get(best) ?? 0)) {
      best = fieldName;
    }
  });
  return best;
}

function fieldValues(issue: Issue, fieldName: string): FieldValue[] {
  const field = fieldOf(issue, fieldName);
  if (!field || field.value === null || typeof field.value !== 'object') {
    return [];
  }
  return Array.isArray(field.value) ? field.value : [field.value];
}


function withOrphans(board: Board, lanes: Lane[]): Lane[] {
  if (board.hideOrphansSwimlane) {
    return lanes;
  }
  const orphans: Lane = {key: ORPHANS_LANE, kind: 'orphans', title: t.uncategorized, value: null, issue: null};
  return board.orphansAtTheTop ? [orphans, ...lanes] : [...lanes, orphans];
}

export function buildLanes(board: Board | null, issues: Issue[]): LaneLayout {
  const settings = board?.swimlaneSettings;
  const valueNames = (settings?.values ?? []).map(value => value.name);
  const fieldName = settings?.enabled && settings.field?.name
    ? resolveFieldName(issues, settings.field.name, settings.field.presentation ?? null, valueNames)
    : null;

  if (settings?.enabled) {
    console.info('[flex-boards] swimlanes', settings.$type, settings.field?.name, '->', fieldName);
  }

  if (!board || !settings?.enabled || !fieldName) {
    return {
      lanes: [{key: ALL_LANE, kind: 'none', title: '', value: null, issue: null}],
      cards: issues,
      laneOf: () => ALL_LANE,
      fieldName: null
    };
  }

  if (settings.$type.includes('IssueBased')) {
    const laneIssues = issues.filter(issue =>
      fieldValues(issue, fieldName).some(value => valueNames.some(name => matches(value, name)))
    );
    const laneIds = new Set(laneIssues.map(issue => issue.id));
    const lanes = laneIssues.map<Lane>(issue => ({
      key: `issue:${issue.id}`,
      kind: 'issue',
      title: issue.summary,
      value: issue.id,
      issue
    }));
    return {
      lanes: withOrphans(board, lanes),
      cards: issues.filter(issue => !laneIds.has(issue.id)),
      laneOf: issue => {
        const parentId = issue.parent?.issues?.find(parent => laneIds.has(parent.id))?.id;
        if (parentId) {
          return `issue:${parentId}`;
        }
        return board.hideOrphansSwimlane ? null : ORPHANS_LANE;
      },
      fieldName
    };
  }

  const labels = new Map<string, string>();
  issues.forEach(issue => fieldValues(issue, fieldName).forEach(value => {
    valueNames.filter(name => matches(value, name)).forEach(name => labels.set(name, valueLabel(value) || name));
  }));

  const lanes = valueNames.map<Lane>(name => ({
    key: `value:${name}`,
    kind: 'attribute',
    title: labels.get(name) ?? name,
    value: name,
    issue: null
  }));

  return {
    lanes: withOrphans(board, lanes),
    cards: issues,
    laneOf: issue => {
      const values = fieldValues(issue, fieldName);
      const name = valueNames.find(candidate => values.some(value => matches(value, candidate)));
      if (name !== undefined) {
        return `value:${name}`;
      }
      return board.hideOrphansSwimlane ? null : ORPHANS_LANE;
    },
    fieldName
  };
}
