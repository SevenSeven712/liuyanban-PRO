(function (global) {
  'use strict';
  var state = { game: null, moves: [], channel: null, roomId: null, sb: null, user: null, onClose: null, optimisticMove: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { if (typeof global.showCustomToast === 'function') global.showCustomToast(msg); }

  function renderPlayers() {
    var el = $('gomokuPlayers'); if (!el) return;
    var g = state.game;
    if (!g) {
      el.innerHTML = '<div style="text-align:center;padding:10px 0;">' +
        '<div style="font-size:1.1em;font-weight:800;color:var(--text);margin-bottom:4px;">五子棋联机对战</div>' +
        '<div style="font-size:.8em;color:var(--text-muted);margin-bottom:12px;">邀请房间内的小伙伴来一局吧</div>' +
        '<button class="lobby-btn" onclick="window.Gomoku.create()">发起对局</button>' +
        '</div>';
      return;
    }
    var bn = g.black_name || '虚位以待', wn = g.white_name || '虚位以待', extra = '';
    if (g.status === 'waiting') {
      var meIn = g.black_id === state.user.id || g.white_id === state.user.id;
      if (!meIn && (!g.black_id || !g.white_id)) extra = '<button class="lobby-btn" style="margin-top:12px; font-size:0.85em; padding:8px 24px;" onclick="window.Gomoku.join()">加入对局</button>';
    } else if (g.status === 'finished') {
      extra = '<button class="lobby-btn" style="margin-top:12px; font-size:0.85em; padding:8px 24px;" onclick="window.Gomoku.reset()">再来一局</button>';
    }
    el.innerHTML = '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:12px;">' +
      '<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:.85em;background:rgba(0,0,0,0.05);padding:6px 12px;border-radius:8px;"><span style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 30% 30%, #666, #000);"></span>' + esc(bn) + '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:.85em;background:rgba(0,0,0,0.05);padding:6px 12px;border-radius:8px;"><span style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 30% 30%, #fff, #ccc);"></span>' + esc(wn) + '</div></div>' + extra;
  }

  function renderStatus() {
    var el = $('gomokuStatus'); if (!el) return;
    var g = state.game;
    if (!g) { el.textContent = ''; return; }
    if (g.status === 'waiting') { el.innerHTML = '<span style="color:#3B82F6;font-weight:800;">等待玩家加入…</span>'; return; }
    if (g.status === 'playing') {
      var my = g.black_id === state.user.id ? 'black' : (g.white_id === state.user.id ? 'white' : null);
      if (my) el.innerHTML = (g.turn === my) ? '<span style="color:#10B981;font-weight:800;background:#ECFDF5;padding:4px 12px;border-radius:99px;box-shadow:0 0 10px rgba(16,185,129,0.3);">轮到你落子</span>' : '<span style="color:var(--text-muted);">等待对方落子…</span>';
      else el.textContent = (g.turn === 'black' ? '黑方' : '白方') + ' 思考中…';
      return;
    }
    if (g.status === 'finished') {
      var w = g.winner === 'black' ? (g.black_name || '黑方') : (g.white_name || '白方');
      el.innerHTML = '<span style="color:#F59E0B;font-size:1.1em;font-weight:900;letter-spacing:1px;">🏆 ' + esc(w) + ' 获胜！</span>';
    }
  }

  function renderBoard() {
    var el = $('gomokuBoard'); if (!el) return;
    var board = [];
    for(var i=0; i<15; i++) board.push(new Array(15).fill(null));
    
    // 找到最后一步的坐标
    var lastX = -1, lastY = -1, lastPlayerId = null;
    if (state.moves.length > 0) {
      var lm = state.moves[state.moves.length - 1];
      lastX = lm.x; lastY = lm.y; lastPlayerId = lm.player_id;
    }

    state.moves.forEach(function(m) {
      var color = m.player_id === state.game.black_id ? 'b' : 'w';
      if (board[m.y]) board[m.y][m.x] = color;
    });

    if (state.optimisticMove) {
      board[state.optimisticMove.y][state.optimisticMove.x] = state.optimisticMove.color + '_opt';
      lastX = state.optimisticMove.x; lastY = state.optimisticMove.y; lastPlayerId = state.user.id;
    }

    var html = '';
    for (var r = 0; r < 15; r++) {
      for (var c = 0; c < 15; c++) {
        var v = board[r][c];
        var cls = '';
        if (v === 'b') cls = 'black';
        else if (v === 'w') cls = 'white';
        else if (v === 'b_opt') cls = 'black opt';
        else if (v === 'w_opt') cls = 'white opt';

        var isLast = (c === lastX && r === lastY);
        var marker = '';
        if (isLast) {
          marker = '<div class="last-move-marker ' + (lastPlayerId === state.user.id ? 'self' : 'other') + '"></div>';
        }

        html += '<div class="gmk-cell" data-r="' + r + '" data-c="' + c + '">' +
          (cls ? '<span class="gmk-stone ' + cls + '"></span>' : '') + marker + '</div>';
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.gmk-cell').forEach(function (cell) {
      cell.onclick = function () { placeStone(parseInt(this.dataset.r, 10), parseInt(this.dataset.c, 10)); };
    });
  }

  function render() { renderPlayers(); renderStatus(); renderBoard(); }

  async function loadGame() {
    if (!state.sb || !state.roomId) return;
    try {
      var res = await state.sb.from('gomoku_games').select('*').eq('room_id', state.roomId).order('created_at', { ascending: false }).limit(1);
      if (res.error) throw res.error;
      state.game = (res.data && res.data.length) ? res.data[0] : null;
      if (state.game) {
        var mv = await state.sb.from('gomoku_moves').select('*').eq('game_id', state.game.id).order('seq', { ascending: true });
        if (!mv.error) state.moves = mv.data || [];
      }
    } catch (e) { state.game = null; }
  }

  function subscribe() {
    if (!state.sb || !state.roomId) return; unsubscribe();
    state.channel = state.sb.channel('sq-gomoku-' + state.roomId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gomoku_games', filter: 'room_id=eq.' + state.roomId }, function (payload) {
        if (payload.eventType === 'DELETE') { state.game = null; state.moves = []; }
        else state.game = payload.new;
        render();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gomoku_moves' }, function (payload) {
        if (state.game && payload.new.game_id === state.game.id) {
          if (!state.moves.find(function(m){ return m.seq === payload.new.seq; })) {
            state.moves.push(payload.new);
            state.moves.sort(function(a,b){ return a.seq - b.seq; });
          }
          if (state.optimisticMove && payload.new.player_id === state.user.id) {
            state.optimisticMove = null;
          }
          render();
        }
      })
      .subscribe();
  }

  function unsubscribe() { if (state.channel && state.sb) { state.sb.removeChannel(state.channel); state.channel = null; } }

  async function createGame() {
    if (!state.sb || !state.roomId) return;
    try {
      var res = await state.sb.from('gomoku_games').insert([{ room_id: state.roomId, status: 'waiting' }]).select().single();
      if (res.error) throw res.error;
      state.game = res.data; state.moves = []; render();
      toast('对局已发起');
    } catch (e) { toast('创建失败：' + e.message); }
  }

  async function joinGame() {
    var g = state.game; if (!g) return;
    try {
      var patch = { status: 'playing' };
      if (!g.black_id) {
        patch.black_id = state.user.id; patch.black_name = state.user.nickname;
      } else if (!g.white_id && g.black_id !== state.user.id) {
        patch.white_id = state.user.id; patch.white_name = state.user.nickname;
      }
      var res = await state.sb.from('gomoku_games').update(patch).eq('id', g.id).select().single();
      state.game = res.data; render();
    } catch (e) { toast('加入失败：' + e.message); }
  }

  async function resetGame() {
    if (state.game && state.sb) { try { await state.sb.from('gomoku_games').delete().eq('id', state.game.id); } catch (e) {} }
    state.game = null; await createGame();
  }

  function checkWin(board, r, c, color) {
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var d = 0; d < dirs.length; d++) {
      var dr = dirs[d][0], dc = dirs[d][1], cnt = 1;
      for (var s = -1; s <= 1; s += 2) {
        var rr = r + dr * s, cc = c + dc * s;
        while (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && board[rr][cc] === color) { cnt++; rr += dr * s; cc += dc * s; }
      }
      if (cnt >= 5) return true;
    }
    return false;
  }

  async function placeStone(r, c) {
    var g = state.game; if (!g || !state.sb) return;
    if (g.status !== 'playing') { toast('对局尚未开始'); return; }
    var myColor = null;
    if (g.black_id === state.user.id) myColor = 'black';
    else if (g.white_id === state.user.id) myColor = 'white';
    else return toast('你正在观战');
    if (g.turn !== myColor) return toast('还没轮到你下棋');

    var my = (g.turn === 'black') ? 'b' : 'w';
    if (state.optimisticMove) return toast('请等待...');

    state.optimisticMove = { x: c, y: r, color: my };
    render();

    try {
      var res = await state.sb.from('gomoku_moves').insert([{
        game_id: g.id, seq: g.last_seq + 1, player_id: state.user.id, x: c, y: r
      }]).select().single();
      if (res.error) throw res.error;

      var board = [];
      for(var i=0; i<15; i++) board.push(new Array(15).fill(null));
      state.moves.forEach(function(m) { board[m.y][m.x] = m.player_id === g.black_id ? 'b' : 'w'; });
      board[r][c] = my;
      
      var won = checkWin(board, r, c, my);
      await state.sb.from('gomoku_games').update({ 
        last_seq: g.last_seq + 1, turn: my === 'b' ? 'white' : 'black',
        status: won ? 'finished' : 'playing', winner: won ? my : null
      }).eq('id', g.id);

    } catch (e) { 
      toast('落子失败：' + e.message);
      state.optimisticMove = null; render();
    }
  }

  global.Gomoku = {
    async open(opts) {
      state.roomId = opts.roomId; state.sb = opts.sb; state.user = opts.user; state.onClose = opts.onClose || null;
      await loadGame(); render(); subscribe();
    },
    close() { unsubscribe(); state.roomId = null; state.game = null; state.moves = []; state.optimisticMove = null; if (typeof state.onClose === 'function') state.onClose(); },
    reset() { resetGame(); }, create() { createGame(); }, join() { joinGame(); }
  };
})(window);