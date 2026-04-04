(function() {
    var MOD_ID = 'jelly-chat';
    var activeTarget = null;
    var activeTargetName = '';
    var lastSyncCount = -1;

    // --- GUARD CLAUSE ---
    // Checks if we are actually logged into the SPA
    function isUserLoggedIn() {
        return window.ApiClient && window.ApiClient._currentUser && window.ApiClient._currentUser.Id;
    }

    function toggleChatUI(show) {
        var el = document.getElementById('jf-private-chat');
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    }

    // --- UI BUILDER ---
    function renderUI() {
        if (document.getElementById('jf-private-chat')) return;

        var chat = document.createElement('div');
        chat.id = 'jf-private-chat';
        // Modern glassmorphism container
        chat.setAttribute('style', 'position:fixed; bottom:20px; right:20px; width:340px; background:rgba(20,20,20,0.85); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.1); z-index:10000; color:white; font-family:sans-serif; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.6); display:none; transition: all 0.3s ease;');
        
        chat.innerHTML = 
            // Header
            '<div id="chat-header" style="padding:15px 20px; background:{{ACCENT_COLOR}}; font-weight:bold; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">' +
                '<span id="header-text">Messages</span>' +
                '<span id="chat-status-dot" style="width:8px; height:8px; background:#fff; border-radius:50%; opacity:0.5; transition: opacity 0.2s;"></span>' +
            '</div>' +
            
            // Expandable Content
            '<div id="chat-content" style="display:none; height:450px; flex-direction:column;">' +
                // Facebook-style horizontal friends list
                '<div id="user-list" style="height:90px; overflow-x:auto; display:flex; gap:12px; padding:15px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.4); align-items:center;">' +
                    '<div style="font-size:11px; color:#888; width:100%; text-align:center;">Looking for users...</div>' +
                '</div>' +
                
                // Message Bubble Area
                '<div id="msg-history" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.2);">' +
                    '<div style="margin:auto; color:#666; font-size:13px;">Select a user above to chat</div>' +
                '</div>' +
                
                // Input Area
                '<div style="padding:15px; background:rgba(0,0,0,0.6); border-top:1px solid rgba(255,255,255,0.05); display:flex;">' +
                    '<input type="text" id="chat-input" placeholder="Type a message..." disabled style="flex:1; padding:12px 18px; background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:24px; outline:none; font-size:14px; transition: border 0.2s;">' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(chat);

        // Click header to toggle open/close
        document.getElementById('chat-header').onclick = function() {
            var c = document.getElementById('chat-content');
            c.style.display = c.style.display === 'none' ? 'flex' : 'none';
            if (c.style.display === 'flex' && activeTarget) {
                document.getElementById('chat-input').focus();
            }
        };

        // Handle Enter key for sending
        var input = document.getElementById('chat-input');
        input.onkeypress = function(e) {
            if (e.key === 'Enter' && this.value && activeTarget) {
                sendMessage(this.value);
                this.value = '';
            }
        };
        
        // UI Polish: Highlight input border on focus
        input.onfocus = function() { this.style.borderColor = '{{ACCENT_COLOR}}'; };
        input.onblur = function() { this.style.borderColor = 'rgba(255,255,255,0.1)'; };
    }

    // --- NETWORK LOGIC ---
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
        }).then(function() {
            // Instantly sync after sending to feel responsive
            sync(); 
        });
    }

    function sync() {
        // GUARD: If logged out, hide UI and skip sync
        if (!isUserLoggedIn()) {
            toggleChatUI(false);
            return;
        }

        toggleChatUI(true); // Ensure UI is visible if logged in

        var myId = window.ApiClient._currentUser.Id;
        var url = '/JellyFrame/mods/' + MOD_ID + '/api/sync?myId=' + myId;
        if (activeTarget) {
            url += '&targetId=' + activeTarget;
        }

        fetch(url)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                updateView(data);
            })
            .catch(function(err) {
                console.error('JellyChat Sync Error:', err);
            });
    }

    function updateView(data) {
        var headerText = document.getElementById('header-text');
        var statusDot = document.getElementById('chat-status-dot');
        var userList = document.getElementById('user-list');
        var msgBox = document.getElementById('msg-history');

        // Heartbeat animation
        statusDot.style.opacity = '1';
        setTimeout(function() { statusDot.style.opacity = '0.3'; }, 600);

        // Render Online Users (Avatars)
        if (data.online.length === 0) {
            userList.innerHTML = '<div style="font-size:11px; color:#666; width:100%; text-align:center;">No other users online</div>';
        } else {
            userList.innerHTML = '';
            data.online.forEach(function(u) {
                var isActive = activeTarget === u.id;
                var avatar = document.createElement('div');
                // Circular Avatar
                avatar.setAttribute('style', 'min-width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.1); border:2px solid ' + (isActive ? '{{ACCENT_COLOR}}' : 'transparent') + '; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; position:relative; transition: border 0.2s; flex-shrink:0;');
                avatar.innerText = u.name.substring(0, 2).toUpperCase();
                
                // Green dot if watching, grey if idle
                var dotColor = u.isWatching ? '#3fb950' : '#888';
                avatar.innerHTML += '<div style="position:absolute; bottom:0px; right:0px; width:12px; height:12px; background:'+dotColor+'; border-radius:50%; border:2px solid #222;"></div>';
                
                avatar.onclick = function() { 
                    activeTarget = u.id; 
                    activeTargetName = u.name;
                    headerText.innerText = 'Chat with ' + u.name;
                    var input = document.getElementById('chat-input');
                    input.disabled = false;
                    input.placeholder = 'Message ' + u.name + '...';
                    lastSyncCount = -1; // Force re-render of messages
                    sync(); // Immediate sync on switch
                };
                userList.appendChild(avatar);
            });
        }

        // Render Private Messages
        if (activeTarget && data.messages) {
            // Only re-render the DOM if the message count changed
            if (data.messages.length !== lastSyncCount) {
                msgBox.innerHTML = '';
                if (data.messages.length === 0) {
                    msgBox.innerHTML = '<div style="margin:auto; color:#666; font-size:13px;">Say hi to ' + activeTargetName + '!</div>';
                }

                var myId = window.ApiClient._currentUser.Id;
                data.messages.forEach(function(m) {
                    var isMe = m.fromId === myId;
                    var bubbleWrap = document.createElement('div');
                    bubbleWrap.setAttribute('style', 'display:flex; flex-direction:column; align-items:' + (isMe ? 'flex-end' : 'flex-start') + ';');
                    
                    var bubble = document.createElement('div');
                    // Modern iMessage/Facebook bubble styling
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
                
                // Auto-scroll to bottom
                msgBox.scrollTop = msgBox.scrollHeight;
                lastSyncCount = data.messages.length;
            }
        }
    }

    // --- INITIALIZATION ---
    renderUI();
    setInterval(sync, 4000); // 4-second polling heartbeat

})();
