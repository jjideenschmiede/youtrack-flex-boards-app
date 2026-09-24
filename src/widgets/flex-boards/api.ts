import type {HostAPI} from '../../../@types/globals';
import type {Board, ColumnNames, Issue, IssueFieldDetails} from './types';

const COLOR = 'color(background,foreground)';

const BOARD_FIELDS = [
  'id',
  'name',
  'owner(login,fullName)',
  'projects(id,shortName)',
  'sprintsSettings(disableSprints)',
  'currentSprint(id,name)',
  'sprints(id,name,archived)',
  'columnSettings(field(name),columns(id,presentation,ordinal,fieldValues(name),wipLimit(min,max)))',
  'colorCoding($type,prototype(name))',
  'estimationField(name)',
  'swimlaneSettings($type,enabled,field(name,presentation),values(id,name))',
  'orphansAtTheTop',
  'hideOrphansSwimlane'
].join(',');

const ISSUE_FIELDS = [
  'id',
  'idReadable',
  'summary',
  'description',
  'resolved',
  `tags(id,name,${COLOR})`,
  'parent(issues(id))',
  `customFields($type,name,value($type,id,name,localizedName,login,fullName,avatarUrl,presentation,text,${COLOR}))`
].join(',');

const FIELD_DETAILS = `$type,name,value(name),projectCustomField(bundle(values(name,localizedName,archived,${COLOR})))`;

export function errorText(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  const candidate = error as {data?: Record<string, string>; message?: string} & Record<string, string>;
  const data = candidate.data ?? candidate;
  return data.error_description || data.error || candidate.message || String(error);
}

export async function loadBoards(host: HostAPI): Promise<Board[]> {
  const boards = await host.fetchYouTrack<Board[]>('agiles', {
    query: {fields: BOARD_FIELDS, $top: 500}
  });
  return boards.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSprintIssues(host: HostAPI, boardId: string, sprintId: string): Promise<Issue[]> {
  const sprint = await host.fetchYouTrack<{issues?: Issue[]}>(`agiles/${boardId}/sprints/${sprintId}`, {
    query: {fields: `issues(${ISSUE_FIELDS})`}
  });
  return sprint.issues ?? [];
}

export function loadIssueFields(host: HostAPI, issueId: string): Promise<IssueFieldDetails[]> {
  return host.fetchYouTrack<IssueFieldDetails[]>(`issues/${issueId}/customFields`, {
    query: {fields: FIELD_DETAILS}
  });
}

export function saveIssueFields(host: HostAPI, issueId: string, customFields: unknown[]): Promise<unknown> {
  return host.fetchYouTrack(`issues/${issueId}`, {
    method: 'POST',
    query: {fields: 'id'},
    body: {customFields}
  });
}

function referrerOrigin(): string {
  return document.referrer ? new URL(document.referrer).origin : '';
}

export async function loadBaseUrl(host: HostAPI): Promise<string> {
  try {
    const config = await host.fetchYouTrack<{baseUrl?: string}>('config', {query: {fields: 'baseUrl'}});
    return config.baseUrl ? config.baseUrl.replace(/\/$/, '') : referrerOrigin();
  } catch {
    return referrerOrigin();
  }
}

const REQUEST_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    promise.then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function loadColumnNames(host: HostAPI, boardId: string): Promise<ColumnNames> {
  try {
    return await withTimeout(
      host.fetchApp<ColumnNames>('backend/column-names', {query: {board: boardId}}),
      REQUEST_TIMEOUT_MS,
      'backend/column-names'
    );
  } catch (error) {
    console.warn('[flex-boards] loading column names failed', error);
    return {};
  }
}

export async function loadCanEdit(host: HostAPI): Promise<boolean> {
  try {
    const result = await withTimeout(
      host.fetchApp<{canEdit?: boolean}>('backend/can-edit', {}),
      REQUEST_TIMEOUT_MS,
      'backend/can-edit'
    );
    return result.canEdit === true;
  } catch (error) {
    console.info('[flex-boards] column renaming not available', error);
    return false;
  }
}

export async function loadFavoriteBoardIds(host: HostAPI): Promise<Set<string> | null> {
  try {
    const boards = await host.fetchYouTrack<{id: string; favorite?: boolean}[]>('agiles', {
      query: {fields: 'id,favorite', $top: 500}
    });
    if (!boards.some(board => typeof board.favorite === 'boolean')) {
      console.info('[flex-boards] board favorites not available');
      return null;
    }
    return new Set(boards.filter(board => board.favorite).map(board => board.id));
  } catch (error) {
    console.info('[flex-boards] board favorites not available', error);
    return null;
  }
}

export async function loadCardFields(host: HostAPI, boardId: string): Promise<string[] | null> {
  try {
    const board = await host.fetchYouTrack<{cardSettings?: {fields?: {field?: {name?: string} | null}[]} | null}>(
      `agiles/${boardId}`,
      {query: {fields: 'cardSettings(fields(field(name)))'}}
    );
    const names = (board.cardSettings?.fields ?? [])
      .map(entry => entry.field?.name)
      .filter((name): name is string => Boolean(name));
    console.info('[flex-boards] card fields', boardId, names.join(', '));
    return board.cardSettings ? names : null;
  } catch (error) {
    console.info('[flex-boards] card settings not available', error);
    return null;
  }
}

export function saveColumnName(host: HostAPI, boardId: string, columnId: string, name: string): Promise<ColumnNames> {
  return host.fetchApp<ColumnNames>('backend/column-names', {
    method: 'POST',
    body: {board: boardId, column: columnId, name}
  });
}
