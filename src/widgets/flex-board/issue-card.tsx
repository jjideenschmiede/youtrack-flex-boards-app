import React, {memo} from 'react';
import Avatar, {Size as AvatarSize} from '@jetbrains/ring-ui-built/components/avatar/avatar';
import Tag from '@jetbrains/ring-ui-built/components/tag/tag';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import {colorOf, displayValue, fieldOf, isUserField, issueUrl, openIssue, plainText, userValues, visibleColor} from './fields';
import type {Issue} from './types';

interface Props {
  issue: Issue;
  baseUrl: string;
  colorField: string | null;
  estimationField: string | null;
  cardFields: string[];
  stateLabel: string;
  dragging: boolean;
  onDragStart: (issue: Issue) => void;
  onDragEnd: () => void;
}

const IssueCardComponent: React.FunctionComponent<Props> = ({
  issue,
  baseUrl,
  colorField,
  estimationField,
  cardFields,
  stateLabel,
  dragging,
  onDragStart,
  onDragEnd
}) => {
  const stripe = colorField ? visibleColor(colorOf(issue, colorField)) : null;
  const description = plainText(issue.description);
  const estimation = estimationField ? displayValue(fieldOf(issue, estimationField)) || '?' : null;

  const classes = ['card'];
  if (dragging) {
    classes.push('card_dragging');
  }
  if (issue.resolved) {
    classes.push('card_resolved');
  }

  return (
    <article
      className={classes.join(' ')}
      style={{borderLeftColor: stripe?.background ?? 'var(--ring-borders-color)'}}
      draggable
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', issue.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(issue);
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={event => {
        event.preventDefault();
        openIssue(baseUrl, issue.idReadable);
      }}
    >
      <div className="card__title">
        <a
          className="card__id"
          href={issueUrl(baseUrl, issue.idReadable)}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            openIssue(baseUrl, issue.idReadable);
          }}
        >
          {issue.idReadable}
        </a>
        <span className="card__summary">{issue.summary}</span>
      </div>

      {stateLabel && <div className="card__state">{stateLabel}</div>}

      {description && <div className="card__description">{description}</div>}

      {issue.tags.length > 0 && (
        <div className="card__tags">
          {issue.tags.map(tag => (
            <Tag
              key={tag.id}
              readOnly
              backgroundColor={tag.color?.background}
              textColor={tag.color?.foreground}
            >
              {tag.name}
            </Tag>
          ))}
        </div>
      )}

      <div className="card__footer">
        {cardFields.filter(name => name !== estimationField).map(name => {
          const field = fieldOf(issue, name);
          if (isUserField(field)) {
            return userValues(field).map(user => (
              <Tooltip key={`${name}-${user.login}`} title={name}>
                <span className="card__user">
                  <Avatar
                    size={AvatarSize.Size16}
                    url={user.avatarUrl}
                    username={user.fullName || user.login}
                    round
                  />
                  {user.fullName || user.login}
                </span>
              </Tooltip>
            ));
          }
          const text = displayValue(field);
          if (!text) {
            return null;
          }
          const value = field && field.value && typeof field.value === 'object' && !Array.isArray(field.value)
            ? field.value
            : null;
          const color = visibleColor(value?.color);
          return (
            <Tooltip key={name} title={name}>
              <span
                className={color ? 'card__field card__field_colored' : 'card__field'}
                style={color ? {backgroundColor: color.background, color: color.foreground} : undefined}
              >
                {text}
              </span>
            </Tooltip>
          );
        })}
        {estimation !== null && (
          <span className="card__estimation">
            <Tooltip title={estimationField}>{estimation}</Tooltip>
          </span>
        )}
      </div>
    </article>
  );
};

export const IssueCard = memo(IssueCardComponent);
