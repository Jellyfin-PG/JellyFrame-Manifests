// browser.js
(function() {
    var activeTarget = null; // The User ID we are currently chatting with
    var lastMsgHash = '';

    function renderUI() {
        var chat = document.createElement('div');
        chat.id = 'jf-private-chat';
        chat.setAttribute('style', 'position:fixed; bottom:0; right:20px; width:300px; background:#111; border:1px solid #333; z-index:10000; color:white; font-family:sans-serif;');
        
        chat.innerHTML = 
            '<div id="chat-header" style="padding:10px; background:{{ACCENT_COLOR}}; font-weight:bold; cursor:pointer;">Messages</div>' +
            '<div id="chat-content" style="display:none; height:400px; flex-direction:column;">' +
                '<div id="user-list" style="height:100px; overflow-y:auto; border-bottom:1px solid #333; padding:5px;"></div>' +
                '<div id="msg-history" style="flex:1; overflow-y:auto; padding:10px;"></div>' +
                '<input type="text" id="chat-input" placeholder="Select a user..." disabled style="width:100%; padding:10px; background:#222; color:white; border:none; box-sizing:border-box;">' +
            '</div>';
        
        document.body.appendChild(chat);

        document.getElementById('chat-header').onclick = function() {
            var c = document.getElementById('chat-content');
            c.style.display = c.style.display === 'none' ? 'flex' : 'none';
        };

        document.getElementById('chat-input').onkeypress = function(e) {
            if (e.key === 'Enter' && this.value && activeTarget) {
                sendMessage(this.value);
                this.value = '';
            }
        };
    }

    function sendMessage(txt) {
        fetch('/JellyFrame/mods/jelly-chat/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromId: ApiClient._currentUser.Id,
                fromName: ApiClient._currentUser.Name,
                toId: activeTarget,
                text: txt
            })
        });
    }

    function sync() {
        var url = '/JellyFrame/mods/jelly-chat/api/sync?myId=' + ApiClient._currentUser.Id;
        if (activeTarget) url += '&targetId=' + activeTarget;

        fetch(url).then(function(r) { return r.json(); }).then(function(data) {
            // Update User List
            var list = document.getElementById('user-list');
            list.innerHTML = '<b>Online Users:</b><br>';
            data.online.forEach(function(u) {
                var btn = document.createElement('button');
                btn.innerText = u.name;
                btn.onclick = function() { 
                    activeTarget = u.id; 
                    document.getElementById('chat-input').disabled = false;
                    document.getElementById('chat-input').placeholder = 'Chat with ' + u.name + '...';
                };
                list.appendChild(btn);
            });

            // Update Messages
            if (activeTarget) {
                var box = document.getElementById('msg-history');
                box.innerHTML = '';
                data.messages.forEach(function(m) {
                    var isMe = m.fromId === ApiClient._currentUser.Id;
                    box.innerHTML += '<div style="text-align:'+(isMe?'right':'left')+'"><b>'+m.from+':</b> '+m.text+'</div>';
                });
            }
        });
    }

    renderUI();
    setInterval(sync, 3000);
})();
