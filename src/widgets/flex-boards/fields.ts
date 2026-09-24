import type {Column, CustomFieldValue, FieldColor, FieldValue, Issue, IssueCustomField} from './types';

export function fieldOf(issue: Issue, name: string): IssueCustomField | null {
  return issue.customFields.find(field => field.name === name) ?? null;
}

function singleValue(value: CustomFieldValue): FieldValue | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function valueNameOf(issue: Issue, fieldName: string): string | null {
  const field = fieldOf(issue, fieldName);
  const value = field ? singleValue(field.value) : null;
  return value?.name ?? null;
}

export function colorOf(issue: Issue, fieldName: string): FieldColor | null {
  const field = fieldOf(issue, fieldName);
  const value = field ? singleValue(field.value) : null;
  return value?.color ?? null;
}

export function valueLabel(value: FieldValue): string {
  return value.localizedName || value.presentation || value.fullName || value.name || value.login || value.text || '';
}

const TIMESTAMP_THRESHOLD = 946684800000;

function formatNumber(field: IssueCustomField, value: number): string {
  if (field.$type.includes('Date')) {
    return new Date(value).toLocaleDateString(YTApp.locale || undefined);
  }
  if (field.$type.startsWith('Simple') && value >= TIMESTAMP_THRESHOLD) {
    return new Date(value).toLocaleString(YTApp.locale || undefined, {dateStyle: 'short', timeStyle: 'short'});
  }
  return String(value);
}

export function displayValue(field: IssueCustomField | null): string {
  if (!field || field.value === null || field.value === undefined) {
    return '';
  }
  if (typeof field.value === 'number') {
    return formatNumber(field, field.value);
  }
  if (typeof field.value !== 'object') {
    return String(field.value);
  }
  const values = Array.isArray(field.value) ? field.value : [field.value];
  return values.map(valueLabel).filter(Boolean).join(', ');
}

export function isUserField(field: IssueCustomField | null): boolean {
  return Boolean(field?.$type.includes('User'));
}

export function userValues(field: IssueCustomField | null): FieldValue[] {
  if (!field || field.value === null || typeof field.value !== 'object') {
    return [];
  }
  return (Array.isArray(field.value) ? field.value : [field.value]).filter(value => value.login || value.fullName);
}

export function plainText(markdown: string | null | undefined): string {
  return (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isEmpty(field: IssueCustomField): boolean {
  return field.value === null || (Array.isArray(field.value) && field.value.length === 0);
}

export function valuesOf(column: Column): string[] {
  return column.fieldValues.map(value => value.name);
}

export function issueUrl(baseUrl: string, idReadable: string): string {
  return `${baseUrl}/issue/${idReadable}`;
}

export function openIssue(baseUrl: string, idReadable: string): void {
  const url = issueUrl(baseUrl, idReadable);
  const opened = window.open(url, '_blank');
  if (opened) {
    opened.opener = null;
    return;
  }
  console.info('[flex-boards] opening a new tab was blocked, opening the issue in this tab');
  try {
    (window.top ?? window).location.href = url;
  } catch (error) {
    console.warn('[flex-boards] opening the issue failed', error);
  }
}

const NEUTRAL_BACKGROUNDS = ['#fff', '#ffffff', 'white', 'transparent'];

export function visibleColor(color: FieldColor | null | undefined): FieldColor | null {
  const background = color?.background?.trim().toLowerCase();
  return color && background && !NEUTRAL_BACKGROUNDS.includes(background) ? color : null;
}
