export interface FieldColor {
  background: string;
  foreground: string;
}

export interface FieldValue {
  $type?: string;
  id?: string;
  name?: string;
  localizedName?: string | null;
  login?: string;
  fullName?: string;
  avatarUrl?: string;
  presentation?: string;
  text?: string;
  archived?: boolean;
  color?: FieldColor | null;
}

export type CustomFieldValue = FieldValue | FieldValue[] | string | number | null;

export interface IssueCustomField {
  $type: string;
  name: string;
  value: CustomFieldValue;
}

export interface IssueFieldDetails extends IssueCustomField {
  projectCustomField?: {
    bundle?: {
      values?: FieldValue[];
    } | null;
  } | null;
}

export interface IssueTag {
  id: string;
  name: string;
  color?: FieldColor | null;
}

export interface Issue {
  id: string;
  idReadable: string;
  summary: string;
  description?: string | null;
  resolved: number | null;
  tags: IssueTag[];
  customFields: IssueCustomField[];
  parent?: {issues?: {id: string}[]} | null;
  detailed?: boolean;
}

export interface Column {
  id: string;
  presentation: string | null;
  ordinal: number;
  fieldValues: {name: string}[];
  wipLimit?: {min: number | null; max: number | null} | null;
}

export interface Sprint {
  id: string;
  name: string;
  archived?: boolean;
}

export interface SwimlaneSettings {
  $type: string;
  enabled: boolean;
  field?: {name: string; presentation?: string | null} | null;
  values?: {id?: string; name: string}[] | null;
}

export interface Board {
  id: string;
  name: string;
  owner?: {login: string; fullName?: string | null} | null;
  projects: {id: string; shortName: string}[];
  sprintsSettings?: {disableSprints: boolean} | null;
  currentSprint?: Sprint | null;
  sprints: Sprint[];
  columnSettings?: {
    field: {name: string} | null;
    columns: Column[];
  } | null;
  colorCoding?: {
    $type: string;
    prototype?: {name: string} | null;
  } | null;
  estimationField?: {name: string} | null;
  swimlaneSettings?: SwimlaneSettings | null;
  orphansAtTheTop?: boolean;
  hideOrphansSwimlane?: boolean;
}

export type ColumnNames = Record<string, string>;

export interface Lane {
  key: string;
  kind: 'attribute' | 'issue' | 'orphans' | 'none';
  title: string;
  value: string | null;
  issue: Issue | null;
}

export interface PickerOption {
  value: string;
  label: string;
  color?: FieldColor | null;
}

export interface PickerRequest {
  title: string;
  message?: string;
  issue: Issue;
  options: PickerOption[];
}
