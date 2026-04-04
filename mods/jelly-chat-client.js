(function () {
    var MOD_ID = 'jelly-chat';
    var activeTarget = null;
    var activeTargetName = '';
    var lastSyncHash = '';

    function isUserLoggedIn() {
        return window.ApiClient && window.ApiClient._currentUser && window.ApiClient._currentUser.Id;
    }

    function injectHeaderButton() {
        if (!document.getElementById('jf-chat-styles')) {
            var style = document.createElement('style');
            style.id = 'jf-chat-styles';
            style.innerHTML = '@keyframes jf-chat-flash { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }';
            document.head.appendChild(style);
        }

        var existingBtn = document.getElementById('jf-header-chat-btn');
        if (existingBtn) {
            existingBtn.style.display = isUserLoggedIn() ? 'inline-block' : 'none';
            return;
        }

        var headerRight = document.querySelector('.headerRight');
        if (!headerRight) return;

        var btn = document.createElement('button');
        btn.id = 'jf-header-chat-btn';
        btn.setAttribute('is', 'paper-icon-button-light');
        btn.className = 'headerButton headerButtonRight paper-icon-button-light';
        btn.title = 'Private Chat';
        btn.style.position = 'relative';
        btn.style.overflow = 'visible';

        btn.innerHTML =
            '<span class="material-icons chat" aria-hidden="true"></span>' +
            '<span id="header-chat-dot" style="position:absolute; top:2px; right:2px; width:12px; height:12px; background:#ffffff; border-radius:50%; display:none; box-shadow:0 0 8px rgba(255,255,255,0.9); animation: jf-chat-flash 1.5s infinite; z-index:10; pointer-events:none;"></span>';

        headerRight.insertBefore(btn, headerRight.firstChild);

        btn.onclick = function () {
            var chatEl = document.getElementById('jf-private-chat');
            var dot = document.getElementById('header-chat-dot');
            if (!chatEl) return;

            var isHidden = chatEl.style.display === 'none';
            chatEl.style.display = isHidden ? 'flex' : 'none';

            if (isHidden) {
                if (dot) dot.style.display = 'none';
                if (activeTarget) {
                    document.getElementById('chat-input').focus();

                    var msgBox = document.getElementById('msg-history');
                    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
                }
            }
        };
    }

    function renderUI() {
        if (document.getElementById('jf-private-chat')) return;

        var chat = document.createElement('div');
        chat.id = 'jf-private-chat';
        chat.setAttribute('style', 'position:fixed; top:70px; right:20px; width:340px; height:500px; max-height:calc(100vh - 100px); background:rgba(20,20,20,0.85); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1); z-index:10000; color:white; font-family:sans-serif; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.6); display:none; flex-direction:column;');

        chat.innerHTML =
            '<div id="chat-header" style="padding:15px 20px; background:{{ACCENT_COLOR}}; font-weight:bold; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">' +
            '<span id="header-text">Messages</span>' +
            '<span id="close-chat-btn" style="cursor:pointer; font-size:20px; line-height:1; opacity:0.8;">&times;</span>' +
            '</div>' +

            '<div id="user-list" style="height:90px; overflow-x:auto; display:flex; gap:12px; padding:15px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.4); align-items:center; flex-shrink:0;">' +
            '<div style="font-size:11px; color:#888; width:100%; text-align:center;">Looking for users...</div>' +
            '</div>' +

            '<div id="msg-history" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.2);">' +
            '<div style="margin:auto; color:#666; font-size:13px;">Select a user above to chat</div>' +
            '</div>' +

            '<div style="padding:15px; background:rgba(0,0,0,0.6); border-top:1px solid rgba(255,255,255,0.05); display:flex; flex-shrink:0;">' +
            '<input type="text" id="chat-input" placeholder="Type a message..." disabled style="flex:1; padding:12px 18px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:24px; outline:none; font-size:14px; transition: border 0.2s;">' +
            '</div>';

        document.body.appendChild(chat);

        document.getElementById('close-chat-btn').onclick = function () {
            chat.style.display = 'none';
        };

        var input = document.getElementById('chat-input');
        input.onkeypress = function (e) {
            if (e.key === 'Enter' && this.value && activeTarget) {
                sendMessage(this.value);
                this.value = '';
            }
        };

        input.onfocus = function () { this.style.borderColor = '{{ACCENT_COLOR}}'; };
        input.onblur = function () { this.style.borderColor = 'rgba(255,255,255,0.1)'; };
    }

    function sendMessage(txt) {
        var me = window.ApiClient._currentUser;
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromId: me.Id,
                fromName: me.Name,
                toId: activeTarget,
                text: txt
            })
        }).then(function () {
            sync();
        });
    }

    function sync() {
        injectHeaderButton();

        if (!isUserLoggedIn()) {
            var chatEl = document.getElementById('jf-private-chat');
            if (chatEl) chatEl.style.display = 'none';
            return;
        }

        var myId = window.ApiClient._currentUser.Id;
        var url = '/JellyFrame/mods/' + MOD_ID + '/api/sync?myId=' + myId;
        if (activeTarget) {
            url += '&targetId=' + activeTarget;
        }

        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                updateView(data);
            })
            .catch(function (err) {
                console.error('JellyChat Sync Error:', err);
            });
    }

    function updateView(data) {
        var headerText = document.getElementById('header-text');
        var userList = document.getElementById('user-list');
        var msgBox = document.getElementById('msg-history');
        var dot = document.getElementById('header-chat-dot');

        if (!data.users || data.users.length === 0) {
            userList.innerHTML = '<div style="font-size:11px; color:#666; width:100%; text-align:center;">No other users found</div>';
        } else {
            userList.innerHTML = '';
            data.users.forEach(function (u) {
                var isActive = activeTarget === u.id;
                var avatar = document.createElement('div');
                var opacity = u.isOnline ? '1' : '0.4';
                avatar.setAttribute('style', 'min-width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.1); border:2px solid ' + (isActive ? '{{ACCENT_COLOR}}' : 'transparent') + '; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; position:relative; transition: border 0.2s; flex-shrink:0; opacity:' + opacity + ';');
                avatar.innerText = u.name.substring(0, 2).toUpperCase();

                if (u.isOnline) {
                    var dotColor = u.isWatching ? '#3fb950' : '#888';
                    avatar.innerHTML += '<div style="position:absolute; bottom:0px; right:0px; width:12px; height:12px; background:' + dotColor + '; border-radius:50%; border:2px solid #222;"></div>';
                }

                avatar.onclick = function () {
                    activeTarget = u.id;
                    activeTargetName = u.name;
                    headerText.innerText = 'Chat with ' + u.name;
                    var input = document.getElementById('chat-input');
                    input.disabled = false;
                    input.placeholder = 'Message ' + u.name + '...';
                    lastSyncHash = '';
                    sync();
                };
                userList.appendChild(avatar);
            });
        }

        if (activeTarget && data.messages) {
            var currentHash = data.messages.length > 0 ? data.messages.length + '_' + data.messages[data.messages.length - 1].time : '0';

            if (currentHash !== lastSyncHash) {
                var myId = window.ApiClient._currentUser.Id;

                if (lastSyncHash !== '' && data.messages.length > 0 && dot) {
                    var lastMsg = data.messages[data.messages.length - 1];
                    var chatContainer = document.getElementById('jf-private-chat');
                    var isChatHidden = chatContainer && chatContainer.style.display === 'none';

                    if (lastMsg.fromId !== myId && isChatHidden) {
                        dot.style.display = 'block';
                    }
                }

                msgBox.innerHTML = '';
                if (data.messages.length === 0) {
                    msgBox.innerHTML = '<div style="margin:auto; color:#666; font-size:13px;">Say hi to ' + activeTargetName + '!</div>';
                }

                data.messages.forEach(function (m) {
                    var isMe = m.fromId === myId;
                    var bubbleWrap = document.createElement('div');
                    bubbleWrap.setAttribute('style', 'display:flex; flex-direction:column; align-items:' + (isMe ? 'flex-end' : 'flex-start') + ';');

                    var bubble = document.createElement('div');
                    var bStyle = 'padding:10px 14px; border-radius:18px; font-size:14px; max-width:85%; line-height:1.4; word-wrap:break-word; ';
                    if (isMe) {
                        bStyle += 'background:{{ACCENT_COLOR}}; color:white; border-bottom-right-radius:4px;';
                    } else {
                        bStyle += 'background:rgba(255,255,255,0.1); color:#eee; border-bottom-left-radius:4px;';
                    }

                    bubble.setAttribute('style', bStyle);
                    bubble.innerText = m.text;
                    bubbleWrap.appendChild(bubble);
                    msgBox.appendChild(bubbleWrap);
                });

                msgBox.scrollTop = msgBox.scrollHeight;
                lastSyncHash = currentHash;
            }
        }
    }

    renderUI();

    sync();

    var initTimerCount = 0;
    var initTimer = setInterval(function () {
        if (document.getElementById('jf-header-chat-btn')) {
            clearInterval(initTimer);
        } else {
            injectHeaderButton();
        }

        if (++initTimerCount > 30) clearInterval(initTimer);
    }, 100);

    setInterval(sync, 4000);

})();
