var currentUser = getSessionUser();
if (!currentUser || !currentUser.id) window.location.href = './index.html';

// 先把基础框架渲染出来，防止因为异步数据没加载完就卡死
try {
  renderHeader('帖子广场', 'posts');
  renderFooter('posts');
} catch(e) { console.error("Header/Footer error:", e); }

var isAdmin = (currentUser.is_admin === true);

// 异步校验管理员，不阻塞
function syncAdminUI() {
  if (isAdmin) {
    var ap = document.getElementById('adminPanelBtn');
    if (ap) ap.style.display = 'inline-flex';
  }
}
syncAdminUI();

if (window.whenUserReady) {
  window.whenUserReady().then(function(u) {
    if (u && u.is_admin === true) {
      isAdmin = true;
      setSessionUser(u);
      syncAdminUI();
    }
  }).catch(function(e){ console.warn("Admin sync error:", e); });
}

function showToast(msg) {
    var t = document.getElementById('toast');
    if(!t) return; t.textContent = msg; t.classList.add('show');
    clearTimeout(window.toastTimer); window.toastTimer = setTimeout(function() { t.classList.remove('show'); }, 3000);
}
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function getUserAvatar(user) {
    if (user && user.avatar_url) return user.avatar_url;
    var name = user ? user.nickname : 'U';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#E5E7EB" rx="50"/><text x="50" y="58" font-size="40" text-anchor="middle" fill="#4B5563" font-family="sans-serif">' + name.charAt(0).toUpperCase() + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

var categories = [], posts = [], currentCategory = '全部', commentCountMap = {}, profilesMapCache = null;

async function fetchProfilesMap(force) {
    if (!force && profilesMapCache) return profilesMapCache;
    var r = await window.sb.from('public_profiles').select('id, nickname, avatar_url');
    if (r.error) return {};
    var map = {}; (r.data || []).forEach(function(u) { map[u.id] = u; });
    profilesMapCache = map; return map;
}
async function fetchCategories() { var res = await window.sb.from('categories').select('*').order('sort_order'); return res.data || []; }
async function fetchPosts() {
    var res = await window.sb.from('posts').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    var data = res.data || [];
    try {
        var map = await fetchProfilesMap(true);
        data.forEach(function(r) { r.users = (r.user_id && map[r.user_id]) ? map[r.user_id] : null; });
    } catch (e) {}
    return data;
}
async function fetchAllCommentCounts() {
    var res = await window.sb.from('post_comments').select('post_id');
    if (!res.error) {
        commentCountMap = {};
        (res.data || []).forEach(function(c) { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1; });
    }
}

function renderCategoryFilter() {
    var container = document.getElementById('categoryFilter');
    var html = '<button class="category-btn active" data-cat="全部" onclick="setCategory(\'全部\', this)">全部</button>';
    categories.filter(function(x) { return x.name !== '未分类'; }).forEach(function(x) {
        html += '<button class="category-btn" data-cat="' + x.id + '" onclick="setCategory(' + x.id + ', this)">' + escapeHtml(x.name) + '</button>';
    });
    container.innerHTML = html;
}
function setCategory(cat, btn) {
    document.querySelectorAll('#categoryFilter .category-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active'); currentCategory = cat; renderPosts();
}
window.setCategory = setCategory;

function renderPostContent(post) {
    var html = '';
    if (post.content && post.content.includes('<')) {
        if (window.DOMPurify) html = DOMPurify.sanitize(post.content);
        else html = '<div style="white-space:pre-wrap;">' + escapeHtml(post.content) + '</div>';
    } else {
        html = '<div style="white-space:pre-wrap;">' + escapeHtml(post.content || '') + '</div>';
    }
    if (post.image_url && !html.includes('<img')) html += '<img src="' + escapeHtml(post.image_url) + '" style="max-width:100%;border-radius:8px;margin-top:6px;" />';
    return html;
}

async function renderPosts() {
    var list = document.getElementById('postList');
    var filtered = posts.filter(function(p) { return currentCategory === '全部' || p.category_id === currentCategory; });
    if (!filtered.length) { list.innerHTML = '<div class="empty-state">暂无帖子，快来抢沙发~</div>'; return; }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i], user = p.users || null;
        var name = user ? user.nickname : (p.author || '匿名');
        var avatar = user ? (user.avatar_url || getUserAvatar(user)) : getUserAvatar({ nickname: p.author });
        var time = new Date(p.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        var catName = '';
        if (p.category_id) { var _cat = categories.find(function(c) { return c.id === p.category_id; }); if (_cat && _cat.name && _cat.name !== '未分类') catName = _cat.name; }
        var raw = p.content ? p.content.replace(/<[^>]*>/g, '') : '';
        var clamped = raw.length > 150 || (p.content && p.content.split('\n').length > 5);
        var commentCount = commentCountMap[p.id] || 0;
        var canDelete = isAdmin || (currentUser && currentUser.id === p.user_id);
        var delBtn = canDelete ? '<button class="del-btn" data-action="delete" data-id="' + p.id + '">删除</button>' : '';
        var reportBtn = '';
        if (currentUser && currentUser.id !== p.user_id && p.user_id) {
            var snapshot = ((p.title || '') + ' ' + (p.content || '').replace(/<[^>]*>/g, '')).substring(0, 200);
            reportBtn = '<button class="report-btn" data-action="report" data-id="' + p.id + '" data-uid="' + p.user_id + '" data-snapshot="' + escapeHtml(snapshot) + '">举报</button>';
        }
        html += '<div class="post-card" data-postid="' + p.id + '">';
        html += '<div class="post-author">';
        // ★ 干净的头像 HTML，不带任何内联 onclick 和 onmouseenter
        html += '<div class="avatar user-avatar" data-uid="' + p.user_id + '" style="cursor:pointer;' + (avatar && avatar.startsWith('http') ? 'background-image:url(' + avatar + ');background-size:cover;background-position:center;' : '') + '">' + (avatar && !avatar.startsWith('http') ? name.charAt(0).toUpperCase() : '') + '</div>';
        html += '<span class="name">' + escapeHtml(name) + '</span>';
        if (p.is_official) html += '<span class="official-tag">官方</span>';
        if (catName) html += '<span class="category-tag">' + escapeHtml(catName) + '</span>';
        html += '<span class="time">' + time + '</span>';
        html += '</div>';
        if (p.title) html += '<div class="post-title">' + escapeHtml(p.title) + '</div>';
        html += '<div class="post-content ' + (clamped ? 'clamped' : '') + '">' + renderPostContent(p) + '</div>';
        html += '<div class="post-footer"><span class="comment-count">评论 ' + commentCount + '</span><div class="actions">' + reportBtn + delBtn + '</div></div></div>';
    }
    list.innerHTML = html;
    
    // ★ 渲染完成后，统一绑定事件
    list.querySelectorAll('.post-card').forEach(function(card) {
        card.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            openPostDetail(this.dataset.postid);
        });
    });
    list.querySelectorAll('.user-avatar').forEach(function(av) {
        av.addEventListener('mouseenter', function(e) { showUserCard(e, this.dataset.uid); });
        av.addEventListener('mouseleave', function() { hideUserCard(); });
        av.addEventListener('click', function(e) { 
            e.stopPropagation(); 
            window.location.href = './user.html?id=' + this.dataset.uid; 
        });
    });
    list.querySelectorAll('.report-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.openReportDialog(this.dataset.uid, 'post', this.dataset.id, this.dataset.snapshot);
        });
    });
    list.querySelectorAll('.del-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if(confirm('确定删除这篇帖子吗？')) {
                window.sb.from('posts').delete().eq('id', this.dataset.id).then(function(r){
                    if(r.error) showToast('删除失败'); else { showToast('已删除'); loadAll(); }
                });
            }
        });
    });
}

async function loadAll() {
    // ★ 强行兜底：无论发生什么，1.5 秒后必定关闭遮罩
    setTimeout(function() {
        if (window.hidePageLoading) window.hidePageLoading();
    }, 1500);

    try {
        document.getElementById('postList').innerHTML = `
          <div class="skeleton-card">
            <div class="skeleton-header"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-title"></div></div>
            <div class="skeleton skeleton-line" style="width:80%;margin-top:8px;"></div>
            <div class="skeleton skeleton-line short"></div>
          </div>
          <div class="skeleton-card">
            <div class="skeleton-header"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-title"></div></div>
            <div class="skeleton skeleton-line short" style="margin-top:8px;"></div>
          </div>
        `;
        categories = await fetchCategories(); 
        renderCategoryFilter();
        posts = await fetchPosts();
        await fetchAllCommentCounts();
        await renderPosts();
    } catch (e) { 
        console.error("loadAll error:", e);
        var el = document.getElementById('postList');
        if (el) el.innerHTML = '<div class="empty-state">加载失败：' + escapeHtml(e.message || String(e)) + '</div>'; 
    } finally {
        if (window.hidePageLoading) window.hidePageLoading();
    }
}


var currentDetailPost = null;
var replyToUserId = null;
var replyToName = null;
var replyToCommentId = null;

async function openPostDetail(postId) {
    var overlay = document.getElementById('detailOverlay');
    var box = document.getElementById('detailContent');
    overlay.classList.add('active');
    box.innerHTML = '<div class="loading-state"><div class="spinner"></div>加载中...</div>';
    var p = posts.find(function(x) { return x.id === postId; });
    if (!p) { box.innerHTML = '<div class="empty-state">帖子不存在</div>'; return; }
    currentDetailPost = p;
    var user = p.users || null;
    var name = user ? user.nickname : (p.author || '匿名');
    var avatar = user ? (user.avatar_url || getUserAvatar(user)) : getUserAvatar({ nickname: name });
    var time = new Date(p.created_at).toLocaleString('zh-CN');
    var reportBtn = '';
    if (currentUser.id !== p.user_id && p.user_id) {
        var snapshot = ((p.title || '') + ' ' + (p.content || '').replace(/<[^>]*>/g, '')).substring(0, 200);
        reportBtn = '<button class="report-btn-detail" style="background:none;border:none;color:#F59E0B;cursor:pointer;font-size:.8em;margin-left:auto;" onclick="window.openReportDialog(\'' + p.user_id + '\', \'post\', \'' + p.id + '\', \'' + escapeHtml(snapshot) + '\')">举报</button>';
    }
    var h = '<div class="detail-post"><div class="post-author">';
    h += '<div class="avatar" style="cursor:pointer;' + (avatar.startsWith('http') ? 'background-image:url(' + avatar + ');background-size:cover;background-position:center;' : '') + '" onmouseenter="showUserCard(event, \'' + p.user_id + '\')" onmouseleave="hideUserCard()" onclick="window.location.href=\'./user.html?id=' + p.user_id + '\'">' + (avatar.startsWith('http') ? '' : name.charAt(0).toUpperCase()) + '</div>';
    h += '<span class="name">' + escapeHtml(name) + '</span>';
    if (p.is_official) h += '<span class="official-tag">官方</span>';
    h += '<span class="time">' + time + '</span>';
    h += reportBtn;
    h += '</div>';
    if (p.title) h += '<div class="post-title">' + escapeHtml(p.title) + '</div>';
    h += '<div class="post-content">' + renderPostContent(p) + '</div></div>';
    h += '<div class="detail-comments" id="detailCommentList"><div class="loading-state"><div class="spinner"></div>加载评论...</div></div>';
    box.innerHTML = h;
    cancelReplyMode();
    loadComments(postId);
}

async function loadComments(postId) {
    var cl = document.getElementById('detailCommentList');
    try {
        var res = await window.sb.from('post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        var comments = res.data || [];
        if (!comments.length) { cl.innerHTML = '<div class="empty-state">还没有评论，来说两句</div>'; return; }
        
        // 排序：置顶的排最前，然后按时间
        comments.sort((a,b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(a.created_at) - new Date(b.created_at);
        });

        var map = await fetchProfilesMap(false);
        var isPostAuthor = (currentDetailPost.user_id === currentUser.id);
        var isAdminUser = (typeof isAdmin !== 'undefined' ? isAdmin : (currentUser.is_admin === true));
        
        var h = '';
        var parents = comments.filter(c => !c.parent_id);
        var childrenMap = {};
        comments.filter(c => c.parent_id).forEach(c => {
            if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
            childrenMap[c.parent_id].push(c);
        });

        function renderNode(c, isChild) {
            var cu = map[c.user_id] || null;
            var cn = cu ? cu.nickname : (c.author || '匿名');
            var cav = cu ? (cu.avatar_url || getUserAvatar(cu)) : getUserAvatar({nickname: cn});
            
            var html = '<div class="comment-item">';
            html += '<div class="avatar" style="cursor:pointer;' + (cav.startsWith('http') ? 'background-image:url(' + cav + ');background-size:cover;background-position:center;' : '') + '" onmouseenter="showUserCard(event, \'' + c.user_id + '\')" onmouseleave="hideUserCard()" onclick="window.location.href=\'./user.html?id=' + c.user_id + '\'">' + (cav.startsWith('http') ? '' : cn.charAt(0).toUpperCase()) + '</div>';
            html += '<div class="body">';
            html += '<div class="meta">';
            if (c.is_pinned) html += '<span class="pin-tag">置顶</span>';
            html += '<span class="name">' + escapeHtml(cn) + '</span>';
            html += '<span class="time">' + new Date(c.created_at).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) + '</span>';
            
            // 权限控制按钮区
            html += '<div style="margin-left:auto;display:flex;gap:4px;">';
            if ((isPostAuthor || isAdminUser) && !isChild) {
                html += '<button class="action-btn pin" onclick="pinComment(\'' + c.id + '\', ' + (c.is_pinned?'true':'false') + ')">' + (c.is_pinned?'取消置顶':'置顶') + '</button>';
            }
            if (currentUser.id === c.user_id || isAdminUser) {
                html += '<button class="action-btn danger" onclick="deleteComment(\'' + c.id + '\')">删除</button>';
            }
            html += '<button class="action-btn primary" onclick="startReply(\'' + c.id + '\', \'' + c.user_id + '\', \'' + escapeHtml(cn) + '\')">回复</button>';
            html += '</div></div>';
            
            if (c.reply_to_user_id && isChild) {
                var replyName = map[c.reply_to_user_id] ? map[c.reply_to_user_id].nickname : '某用户';
                html += '<div class="reply-to">回复 @' + escapeHtml(replyName) + '</div>';
            }
            html += '<div class="txt">' + escapeHtml(c.content) + '</div>';
            html += '</div></div>';
            return html;
        }

        parents.forEach(p => {
            h += renderNode(p, false);
            if (childrenMap[p.id] && childrenMap[p.id].length > 0) {
                h += '<div class="reply-children">';
                childrenMap[p.id].forEach(child => {
                    h += renderNode(child, true);
                });
                h += '</div>';
            }
        });
        
        cl.innerHTML = h;
    } catch (e) {
        console.error(e);
        cl.innerHTML = '<div class="empty-state">评论加载失败</div>';
    }
}

window.startReply = function(cid, uid, name) {
    replyToCommentId = cid;
    replyToUserId = uid;
    replyToName = name;
    var input = document.getElementById('detailCommentInput');
    input.placeholder = '回复 @' + name + '…';
    input.focus();
    document.getElementById('cancelReplyBtn').classList.add('active');
};
function cancelReplyMode() {
    replyToUserId = null;
    replyToName = null;
    replyToCommentId = null;
    var input = document.getElementById('detailCommentInput');
    input.placeholder = '写评论…';
    input.value = '';
    document.getElementById('cancelReplyBtn').classList.remove('active');
}
document.getElementById('cancelReplyBtn').onclick = cancelReplyMode;

document.getElementById('detailSendCommentBtn').onclick = async function() {
    var input = document.getElementById('detailCommentInput');
    var text = input.value.trim();
    if (!text) return;
    this.disabled = true;
    try {
        var row = {
            post_id: currentDetailPost.id,
            user_id: currentUser.id,
            author: currentUser.nickname,
            content: text
        };
        if (replyToUserId) {
            row.reply_to_user_id = replyToUserId;
            row.parent_id = replyToCommentId;
        }
        var res = await window.sb.from('post_comments').insert([row]);
        if (res.error) throw res.error;
        showToast('评论成功');
        
        // ★ 发送通知逻辑
        try {
            var notifyTarget = null;
            if (replyToUserId) {
                // 1. 楼中楼回复：通知被回复的人
                if (replyToUserId !== currentUser.id) notifyTarget = replyToUserId;
            } else {
                // 2. 直接评论帖子：通知帖子作者
                if (currentDetailPost.user_id && currentDetailPost.user_id !== currentUser.id) notifyTarget = currentDetailPost.user_id;
            }

            if (notifyTarget) {
                await window.sb.from('notifications').insert([{
                    user_id: notifyTarget,
                    type: 'comment',
                    notification_type: 'comment',
                    post_id: currentDetailPost.id,
                    comment_author_id: currentUser.id,
                    extra_text: replyToName ? ('回复了你：' + text) : ('评论了你的帖子：' + text),
                    is_read: false
                }]);
            }
        } catch (_ignore) { console.warn('通知发送失败'); }

        cancelReplyMode();
        await loadComments(currentDetailPost.id);
        await fetchAllCommentCounts();
        await renderPosts();
    } catch(e) {
        showToast('评论失败：' + (e.message || '网络错误'));
    } finally {
        this.disabled = false;
    }
};

window.deleteComment = async function(id) {
    if (!confirm('确定删除这条评论吗？')) return;
    try {
        await window.sb.from('post_comments').delete().eq('id', id);
        showToast('已删除');
        loadComments(currentDetailPost.id);
        await fetchAllCommentCounts();
        await renderPosts();
    } catch(e) { showToast('删除失败'); }
};

window.pinComment = async function(id, isPinned) {
    if (!confirm(isPinned ? '取消置顶？' : '确定置顶这条评论？')) return;
    try {
        if (!isPinned) {
            await window.sb.from('post_comments').update({ is_pinned: false }).eq('post_id', currentDetailPost.id);
        }
        await window.sb.from('post_comments').update({ is_pinned: !isPinned }).eq('id', id);
        showToast(isPinned ? '已取消置顶' : '已置顶');
        loadComments(currentDetailPost.id);
    } catch(e) { showToast('操作失败，请确保数据库有 is_pinned 字段'); }
};

document.getElementById('closeDetail').onclick = function() {
    document.getElementById('detailOverlay').classList.remove('active');
};

function openAdminPanel() {
    window.location.href = './admin.html';
}
window.openAdminPanel = openAdminPanel;

loadAll();