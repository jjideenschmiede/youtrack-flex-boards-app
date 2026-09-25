const EDIT_PERMISSIONS = ['ADMIN_UPDATE_APP'];

function readNames(ctx) {
  const raw = ctx.globalStorage.extensionProperties.columnNames;
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

exports.httpHandler = {
  endpoints: [
    {
      method: 'GET',
      path: 'column-names',
      handle: function handle(ctx) {
        const boardId = ctx.request.getParameter('board');
        const names = readNames(ctx);
        ctx.response.json(boardId ? (names[boardId] || {}) : names);
      }
    },
    {
      method: 'GET',
      path: 'can-edit',
      permissions: EDIT_PERMISSIONS,
      handle: function handle(ctx) {
        ctx.response.json({canEdit: true});
      }
    },
    {
      method: 'GET',
      path: 'in-group',
      handle: function handle(ctx) {
        const groups = (ctx.request.getParameter('groups') || '').split('\n').filter(Boolean);
        ctx.response.json({member: groups.some(group => ctx.currentUser.isInGroup(group))});
      }
    },
    {
      method: 'POST',
      path: 'column-names',
      handle: function handle(ctx) {
        const body = ctx.request.json();
        if (!body || typeof body.board !== 'string' || typeof body.column !== 'string') {
          ctx.response.code = 400;
          ctx.response.json({error: 'board and column are required'});
          return;
        }

        const names = readNames(ctx);
        const board = names[body.board] || {};
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (name) {
          board[body.column] = name;
        } else {
          delete board[body.column];
        }

        if (Object.keys(board).length > 0) {
          names[body.board] = board;
        } else {
          delete names[body.board];
        }

        ctx.globalStorage.extensionProperties.columnNames = JSON.stringify(names);
        ctx.response.json(board);
      }
    }
  ]
};
