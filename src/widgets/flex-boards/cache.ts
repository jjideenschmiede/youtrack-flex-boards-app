import type {HostAPI} from '../../../@types/globals';
import {fieldOf, plainText} from './fields';
import type {Board, FieldValue, Issue, IssueCustomField} from './types';

const CACHE_PREFIX = 'flex-boards:index:';
const META_KEY = 'flex-boards:index-meta';
const CACHE_VERSION = 5;
const HOST_STORAGE_BUDGET = 800000;
const BROWSER_STORAGE_BUDGET = 4000000;
const DESCRIPTION_LENGTH = 200;

type CachedRow = [
  id: string,
  idReadable: string,
  summary: string,
  resolved: number,
  columnValue: string | null,
  laneValue: string | null,
  parentId: string | null
];

export interface CachedIndex {
  version: number;
  board: Board;
  columnField: string;
  columnType: string;
  laneField: string | null;
  laneType: string | null;
  rows: CachedRow[];
  details: Issue[];
  cardFields: string[] | null;
}

type CacheMeta = Record<string, {size: number; usedAt: number}>;

export interface KeyValueStorage {
  budget?: number;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getKeys: () => Promise<string[]>;
}

function browserStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage;
    storage.getItem(CACHE_PREFIX);
    return {
      budget: BROWSER_STORAGE_BUDGET,
      getItem: async key => storage.getItem(key),
      setItem: async (key, value) => storage.setItem(key, value),
      removeItem: async key => storage.removeItem(key),
      getKeys: async () => Object.keys(storage)
    };
  } catch {
    return null;
  }
}

export function appStorage(host: HostAPI): KeyValueStorage | null {
  return (host as HostAPI & {storage?: KeyValueStorage}).storage ?? browserStorage();
}

export function cacheKey(boardId: string, sprintId: string): string {
  return `${CACHE_PREFIX}${boardId}:${sprintId}`;
}

function trimValue(value: FieldValue): FieldValue {
  const trimmed: FieldValue = {};
  (['name', 'localizedName', 'login', 'fullName', 'avatarUrl', 'presentation', 'text', 'color'] as const)
    .forEach(property => {
      if (value[property] !== undefined && value[property] !== null) {
        (trimmed as Record<string, unknown>)[property] = value[property];
      }
    });
  return trimmed;
}

function trimIssue(issue: Issue, keepFields: Set<string>): Issue {
  return {
    id: issue.id,
    idReadable: issue.idReadable,
    summary: issue.summary,
    description: plainText(issue.description).slice(0, DESCRIPTION_LENGTH),
    resolved: issue.resolved,
    tags: issue.tags,
    parent: issue.parent,
    detailed: true,
    customFields: issue.customFields
      .filter(field => keepFields.has(field.name))
      .map(field => {
        let value = field.value;
        if (Array.isArray(value)) {
          value = value.map(trimValue);
        } else if (value !== null && typeof value === 'object') {
          value = trimValue(value);
        }
        return {$type: field.$type, name: field.name, value};
      })
  };
}

function firstValue(field: IssueCustomField | null): FieldValue | null {
  if (!field || field.value === null || typeof field.value !== 'object') {
    return null;
  }
  return Array.isArray(field.value) ? field.value[0] ?? null : field.value;
}

function valueKey(field: IssueCustomField | null): string | null {
  const value = firstValue(field);
  return value ? value.login ?? value.name ?? null : null;
}

export function toCache(
  board: Board,
  issues: Issue[],
  columnField: string,
  laneField: string | null,
  details: Issue[] = [],
  keepFields: string[] = [],
  cardFields: string[] | null = null
): CachedIndex {
  const kept = new Set([columnField, ...keepFields, ...(laneField ? [laneField] : [])]);
  const sample = issues.find(issue => fieldOf(issue, columnField));
  const laneSample = laneField ? issues.find(issue => fieldOf(issue, laneField)) : undefined;
  return {
    version: CACHE_VERSION,
    board,
    columnField,
    columnType: sample ? fieldOf(sample, columnField)?.$type ?? 'StateIssueCustomField' : 'StateIssueCustomField',
    laneField,
    laneType: laneSample && laneField ? fieldOf(laneSample, laneField)?.$type ?? null : null,
    rows: issues.map(issue => [
      issue.id,
      issue.idReadable,
      issue.summary,
      issue.resolved ?? 0,
      valueKey(fieldOf(issue, columnField)),
      laneField ? valueKey(fieldOf(issue, laneField)) : null,
      issue.parent?.issues?.[0]?.id ?? null
    ]),
    details: details.map(issue => trimIssue(issue, kept)),
    cardFields
  };
}

export function fromCache(cached: CachedIndex): Issue[] {
  const details = new Map(cached.details.map(issue => [issue.id, issue]));
  return cached.rows.map(([id, idReadable, summary, resolved, columnValue, laneValue, parentId]) => {
    const detailed = details.get(id);
    if (detailed) {
      return detailed;
    }
    const customFields: IssueCustomField[] = [{
      $type: cached.columnType,
      name: cached.columnField,
      value: columnValue === null ? null : {name: columnValue}
    }];
    if (cached.laneField && cached.laneType) {
      customFields.push({
        $type: cached.laneType,
        name: cached.laneField,
        value: laneValue === null ? null : {name: laneValue, login: laneValue}
      });
    }
    return {
      id,
      idReadable,
      summary,
      resolved: resolved || null,
      tags: [],
      customFields,
      parent: parentId ? {issues: [{id: parentId}]} : null,
      detailed: false
    };
  });
}

export async function readIndexCache(host: HostAPI, key: string): Promise<CachedIndex | null> {
  try {
    const raw = await appStorage(host)?.getItem(key);
    const cached = raw ? JSON.parse(raw) as CachedIndex : null;
    return cached && cached.version === CACHE_VERSION ? cached : null;
  } catch (error) {
    console.info('[flex-boards] reading the board cache failed', error);
    return null;
  }
}

async function readMeta(storage: KeyValueStorage): Promise<CacheMeta> {
  try {
    const raw = await storage.getItem(META_KEY);
    return raw ? JSON.parse(raw) as CacheMeta : {};
  } catch {
    return {};
  }
}

export async function writeIndexCache(host: HostAPI, key: string, index: CachedIndex): Promise<void> {
  const storage = appStorage(host);
  if (!storage) {
    return;
  }
  const budget = storage.budget ?? HOST_STORAGE_BUDGET;
  try {
    let payload = JSON.stringify(index);
    let withDetails = index.details.length;
    if (payload.length > budget && withDetails > 0) {
      payload = JSON.stringify({...index, details: []});
      withDetails = 0;
    }
    if (payload.length > budget) {
      console.info('[flex-boards] board too large for the cache', key, payload.length);
      return;
    }

    const meta = await readMeta(storage);
    delete meta[key];
    const keys = await storage.getKeys();
    await Promise.all(keys
      .filter(candidate => candidate.startsWith(CACHE_PREFIX) && candidate !== key && !meta[candidate])
      .map(candidate => storage.removeItem(candidate)));

    const oldest = Object.entries(meta).sort((a, b) => a[1].usedAt - b[1].usedAt);
    let total = oldest.reduce((sum, [, entry]) => sum + entry.size, 0);
    while (total + payload.length > budget && oldest.length > 0) {
      const [evicted, entry] = oldest.shift()!;
      await storage.removeItem(evicted);
      delete meta[evicted];
      total -= entry.size;
    }

    await storage.setItem(key, payload);
    meta[key] = {size: payload.length, usedAt: Date.now()};
    await storage.setItem(META_KEY, JSON.stringify(meta));
    console.info('[flex-boards] board cached', key, `${Math.round(payload.length / 1024)} KB`,
      `${withDetails} detailed cards`, `budget ${Math.round(budget / 1024)} KB`);
  } catch (error) {
    console.info('[flex-boards] writing the board cache failed', error);
  }
}
