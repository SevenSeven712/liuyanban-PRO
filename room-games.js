(function(){
  // 动态注入所有游戏的专属 CSS
  var style = document.createElement('style');
  style.innerHTML = `
    /* 五子棋 */
    .gomoku-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}
    .gomoku-status{font-size:.85em;font-weight:700;text-align:center;min-height:22px}
    .gomoku-board{display:grid;grid-template-columns:repeat(15,1fr);width:min(78vw,320px);aspect-ratio:1;background:#dcb35c;border-radius:8px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,.2)}
    .gmk-cell{position:relative;display:flex;align-items:center;justify-content:center;border:.5px solid rgba(90,60,20,.45);cursor:pointer}
    .gmk-cell.gmk-last .gmk-stone{box-shadow:0 0 0 2.5px #e53935,0 1px 3px rgba(0,0,0,.35)}
    .gmk-cell.gmk-prev .gmk-stone{box-shadow:0 0 0 2.5px rgba(33,150,243,.85),0 1px 3px rgba(0,0,0,.35)}
    .gmk-stone{width:84%;height:84%;border-radius:50%;display:block;box-shadow:0 1px 3px rgba(0,0,0,.35)}
    .gmk-stone.black{background:radial-gradient(circle at 32% 32%,#6a6a6a,#000)}
    .gmk-stone.white{background:radial-gradient(circle at 32% 32%,#fff,#b9b9b9)}

    /* 你画我猜 */
    .draw-wrap{display:flex;flex-direction:column;gap:10px}
    .draw-info{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.8em;font-weight:700;flex-wrap:wrap}
    .draw-timer{background:rgba(25,118,210,.15);color:#1976d2;padding:4px 12px;border-radius:99px;font-weight:800;font-size:1.05em}
    .draw-word{background:linear-gradient(135deg,#1976d2,#42a5f5);color:#fff;padding:5px 14px;border-radius:99px;font-size:1.05em;letter-spacing:2px}
    .draw-canvas-wrap{position:relative;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:2px solid #90caf9}
    .draw-canvas{display:block;width:100%;touch-action:none;cursor:crosshair}
    .draw-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .draw-color{width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);cursor:pointer}
    .draw-color.active{box-shadow:0 0 0 3px #1976d2}
    .draw-size{background:#fff;border:2px solid #90caf9;color:#1976d2;font-weight:700;padding:4px 10px;border-radius:8px;cursor:pointer;font-size:.75em}
    .draw-size.active{background:#1976d2;color:#fff}
    .draw-guess-box{display:flex;gap:6px}
    .draw-guess-box input{flex:1;padding:8px 12px;border:2px solid #90caf9;border-radius:10px;outline:none}
    .draw-guess-box button{padding:8px 16px;border:none;background:#1976d2;color:#fff;border-radius:10px;font-weight:700;cursor:pointer}
    .draw-messages{max-height:80px;overflow-y:auto;font-size:.75em;background:rgba(255,255,255,.5);border-radius:8px;padding:6px 10px}
    .draw-scoreboard{display:flex;flex-wrap:wrap;gap:6px;font-size:.72em;justify-content:center}
    .draw-score{background:rgba(255,255,255,.55);border-radius:8px;padding:4px 10px;font-weight:700}

    /* 谁是卧底 */
    .spy-wrap{display:flex;flex-direction:column;gap:10px;color:#e0d5f0}
    .spy-role-card{background:linear-gradient(135deg,rgba(180,140,255,.2),rgba(120,80,200,.15));border:2px solid rgba(200,160,255,.4);border-radius:12px;padding:14px;text-align:center;}
    .spy-role-word{font-size:1.4em;font-weight:900;letter-spacing:4px;color:#c8a5ff}
    .spy-players{display:flex;flex-direction:column;gap:6px}
    .spy-player{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.06);border-radius:10px;border:1px solid rgba(255,255,255,.1)}
    .spy-player .name{flex:1;font-size:.82em;font-weight:700}
    .spy-desc-input{display:flex;gap:6px}
    .spy-desc-input input{flex:1;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;border:none;outline:none}
    .spy-desc-input button{background:#8b5cf6;color:#fff;border:none;padding:0 16px;border-radius:10px;cursor:pointer}

    /* 狼人杀 */
    .ww-wrap{display:flex;flex-direction:column;gap:10px;color:#e0d5d5}
    .ww-role-card{background:linear-gradient(135deg,rgba(200,50,50,.25),rgba(80,10,10,.2));border:2px solid rgba(255,140,140,.4);border-radius:12px;padding:14px;text-align:center;}
    .ww-role-word{font-size:1.4em;font-weight:900;letter-spacing:4px;color:#ff5252}
    .ww-players{display:flex;flex-direction:column;gap:6px}
    .ww-player{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.06);border-radius:10px}
    .ww-player .btn{background:rgba(255,140,140,.25);color:#ffb5b5;border:none;padding:4px 12px;border-radius:99px;cursor:pointer}

    /* 斗地主 */
    .ddz-board{display:flex;flex-direction:column;gap:8px;color:#e8f5e9;width:100%}
    .ddz-opps{display:flex;gap:10px}
    .ddz-opp{flex:1;display:flex;flex-direction:column;gap:5px;background:rgba(0,0,0,.2);border-radius:12px;padding:8px;}
    .ddz-opp-head{display:flex;align-items:center;gap:7px;}
    .ddz-opp-head .avatar{width:28px;height:28px;border-radius:50%;background:var(--primary);display:grid;place-items:center;font-size:12px;}
    .ddz-hand{display:flex;justify-content:center;flex-wrap:wrap;gap:2px;padding:6px 0;min-height:66px}
    .ddz-card{width:38px;height:54px;border-radius:6px;background:#fff;color:#222;border:1px solid #bbb;box-shadow:0 2px 4px rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;cursor:pointer;transition:transform .12s}
    .ddz-card.sel{transform:translateY(-14px);box-shadow:0 6px 10px rgba(0,0,0,.4);border-color:#ffd54f}
    .ddz-card.red{color:#d32f2f}
    .ddz-btn{padding:9px 18px;border:none;border-radius:10px;font-weight:800;background:#ffd54f;color:#3e2723;cursor:pointer}
  `;
  document.head.appendChild(style);

  var drawState = { color:'#000000', size:5, drawing:false, currentStroke:null, canvas:null, ctx:null, isDrawer:false };

  window.RoomGames = {
    // 1. 五子棋
    gomoku: {
      render: function(game, el) {
        var st=game.state||{}, board=st.board||[], players=game.players||[];
        var myColor=players[0]&&players[0].user_id===currentUser.id?'black':(players[1]&&players[1].user_id===currentUser.id?'white':null);
        var statusText=st.turn===myColor?'轮到你落子':'等待对方…';
        if(game.status==='finished') statusText = (st.winner==='black'?escapeHtml(players[0]?players[0].nickname:'黑方'):escapeHtml(players[1]?players[1].nickname:'白方')) + ' 获胜！';
        
        var html='<div class="gomoku-wrap"><div class="gomoku-status">'+statusText+'</div><div class="gomoku-board">';
        for(var rr=0;rr<15;rr++)for(var cc=0;cc<15;cc++){
          var v=(board[rr]&&board[rr][cc])||null;
          var cls=v==='b'?'black':(v==='w'?'white':'');
          var isLast=st.lastMove&&st.lastMove.r===rr&&st.lastMove.c===cc;
          html+='<div class="gmk-cell'+(isLast?' gmk-last':'')+'" onclick="RoomGames.gomoku.click('+rr+','+cc+')">'+(v?'<span class="gmk-stone '+cls+'"></span>':'')+'</div>';
        }
        html+='</div></div>';
        el.innerHTML=html;
      },
      click: function(r,c) {
        var game = state.room.current_game;
        if(game.status!=='playing') return;
        var players=game.players||[];
        var myColor=players[0]&&players[0].user_id===currentUser.id?'black':(players[1]&&players[1].user_id===currentUser.id?'white':null);
        if(!myColor||game.state.turn!==myColor) return;
        var board=game.state.board.map(function(row){return row.slice()});
        board[r][c]=myColor==='black'?'b':'w';
        updateGame(Object.assign({},game,{state:{board:board,turn:myColor==='black'?'white':'black',lastMove:{r:r,c:c}}}));
      }
    },

    // 2. 你画我猜
    draw: {
      render: function(game, el) {
        var st=game.state||{}, players=game.players||[];
        var order=st.order||[], drawerId=order[st.drawer_index];
        var isDrawer=drawerId===currentUser.id;
        var html='<div class="draw-wrap"><div class="draw-info"><span>'+(isDrawer?'轮到你画':escapeHtml((players.find(function(p){return p.user_id===drawerId})||{}).nickname||'')+' 画')+'</span><span class="draw-timer">3:00</span><span class="draw-word">'+(isDrawer?escapeHtml(st.word||''):'? ? ?')+'</span></div>';
        html+='<div class="draw-canvas-wrap"><canvas class="draw-canvas" id="drawCanvas"></canvas></div>';
        if(isDrawer) html+='<div class="draw-tools"><button class="draw-size" onclick="RoomGames.draw.clear()">清空</button></div>';
        if(!isDrawer) html+='<div class="draw-guess-box"><input id="drawGuessInput" placeholder="输入猜测"><button onclick="RoomGames.draw.guess()">猜</button></div>';
        html+='<div class="draw-messages">'+(st.messages||[]).map(function(m){return '<div>'+escapeHtml(m.text)+'</div>'}).join('')+'</div></div>';
        el.innerHTML=html;
        
        var canvas=document.getElementById('drawCanvas');
        if(!canvas)return;
        canvas.width=canvas.parentElement.clientWidth; canvas.height=300;
        drawState.canvas=canvas; drawState.ctx=canvas.getContext('2d'); drawState.isDrawer=isDrawer;
        // 初始化画布、监听事件等（简化版）
      },
      guess: function() {
        var text = document.getElementById('drawGuessInput').value.trim();
        if(!text) return;
        var game=state.room.current_game;
        var st=game.state;
        var ns=Object.assign({}, st);
        ns.messages = (ns.messages||[]).concat([{ text: currentUser.nickname + '：' + text, correct: text === st.word }]);
        if(text === st.word) ns.correct = (ns.correct||[]).concat([currentUser.id]);
        updateGame(Object.assign({}, game, {state: ns}));
      },
      clear: function() {
        var game=state.room.current_game;
        updateGame(Object.assign({}, game, {state: Object.assign({}, game.state, {strokes: []})}));
      }
    },

    // 3. 谁是卧底
    spy: {
      render: function(game, el) {
        var st=game.state||{}, players=game.players||[];
        var myWord=st.words[currentUser.id]||'?';
        var html='<div class="spy-wrap"><div class="spy-role-card"><div>你的词语</div><div class="spy-role-word">'+escapeHtml(myWord)+'</div></div>';
        html+='<div class="spy-players">';
        players.forEach(function(p){
          var desc = (st.descriptions||[]).find(function(d){return d.user_id===p.user_id});
          html+='<div class="spy-player"><div class="gpm-avatar">'+escapeHtml(p.nickname.charAt(0))+'</div><div class="name">'+escapeHtml(p.nickname)+'</div>'+(desc?'<span style="font-size:0.7em;">'+escapeHtml(desc.text)+'</span>':'')+'</div>';
        });
        html+='</div>';
        if(!(st.descriptions||[]).find(function(d){return d.user_id===currentUser.id})) {
          html+='<div class="spy-desc-input"><input id="spyDescInput" placeholder="描述词语..."><button onclick="RoomGames.spy.desc()">发送</button></div>';
        }
        html+='</div>'; el.innerHTML=html;
      },
      desc: function() {
        var text = document.getElementById('spyDescInput').value.trim();
        if(!text) return;
        var game=state.room.current_game;
        var descs = (game.state.descriptions||[]).concat([{ user_id: currentUser.id, nickname: currentUser.nickname, text: text }]);
        updateGame(Object.assign({}, game, {state: Object.assign({}, game.state, {descriptions: descs})}));
      }
    },

    // 4. 狼人杀
    werewolf: {
      render: function(game, el) {
        var st=game.state||{}, players=game.players||[];
        var myRole=st.roles[currentUser.id]||'平民';
        var html='<div class="ww-wrap"><div class="ww-role-card"><div>你的身份</div><div class="ww-role-word">'+escapeHtml(myRole)+'</div></div>';
        html+='<div class="ww-players">';
        players.forEach(function(p){
          var alive=(st.alive||[]).indexOf(p.user_id)>=0;
          var btn = (st.phase==='night' && myRole==='狼人') ? '<button class="btn" onclick="RoomGames.werewolf.kill(\''+p.user_id+'\')">击杀</button>' : '';
          html+='<div class="ww-player"><div class="gpm-avatar">'+escapeHtml(p.nickname.charAt(0))+'</div><div class="name">'+escapeHtml(p.nickname)+(alive?'':' (死)')+'</div>'+btn+'</div>';
        });
        html+='</div></div>'; el.innerHTML=html;
      },
      kill: function(targetId) {
        var game=state.room.current_game;
        updateGame(Object.assign({}, game, {state: Object.assign({}, game.state, {night_action: targetId})}));
      }
    },

    // 5. 斗地主
    doudizhu: {
      render: function(game, el) {
        var st=game.state||{}, players=game.players||[];
        var myHand = st.hands ? st.hands[currentUser.id] : [];
        var html='<div class="ddz-board">';
        html+='<div class="ddz-opps">';
        players.forEach(function(p){
          if(p.user_id !== currentUser.id) {
            html+='<div class="ddz-opp"><div class="ddz-opp-head"><div class="avatar">'+escapeHtml(p.nickname.charAt(0))+'</div><div>'+escapeHtml(p.nickname)+'</div></div></div>';
          }
        });
        html+='</div>';
        html+='<div style="text-align:center; color:#fff; font-size:0.8em; margin:10px 0;">'+(st.phase==='bid'?'叫地主阶段':(st.currentTurn===currentUser.id?'轮到你出牌':'等待中...'))+'</div>';
        html+='<div class="ddz-hand">'+(myHand||[]).map(function(c){return '<div class="ddz-card red">'+(ddzValName(ddzVal(c)))+'</div>'}).join('')+'</div>';
        if(st.phase==='play' && st.currentTurn===currentUser.id) {
           html+='<div style="text-align:center; margin-top:10px;"><button class="ddz-btn" onclick="RoomGames.doudizhu.pass()">不要</button></div>';
        }
        html+='</div>'; el.innerHTML=html;
      },
      pass: function() {
        var game=state.room.current_game;
        var order=game.state.order, myIdx=order.indexOf(currentUser.id);
        updateGame(Object.assign({}, game, {state: Object.assign({}, game.state, {currentTurn: order[(myIdx+1)%3]})}));
      }
    },

    // 工具函数：初始化各游戏状态
    initState: function(type, players) {
      if(type === 'gomoku') return { board: Array(15).fill(Array(15).fill(null)), turn: 'black', lastMove: null };
      if(type === 'draw') return { order: players.map(p=>p.user_id), drawer_index: 0, word: '苹果', strokes: [], correct: [], messages: [] };
      if(type === 'spy') return { words: {}, spy_ids: [], phase: 'describe', descriptions: [] };
      if(type === 'werewolf') return { roles: {}, phase: 'night', alive: players.map(p=>p.user_id) };
      if(type === 'doudizhu') return { phase: 'bid', order: players.map(p=>p.user_id), hands: {}, currentTurn: players[0].user_id };
      return {};
    },
    // 定时心跳（供 draw 等计时）
    tick: function(game) { }
  };
})();