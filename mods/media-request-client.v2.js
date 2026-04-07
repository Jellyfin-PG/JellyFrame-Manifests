(function () {
    'use strict';

    var API         = '/JellyFrame/mods/media-request/api';
    var STYLE_ID    = 'jf-mr-style';
    var BTN_ID      = 'jf-mr-nav-btn';
    var OVERLAY_ID  = 'jf-mr-overlay';
    var MENU_LABEL  = '{{MENU_LABEL}}';
    var ACCENT      = '{{ACCENT_COLOR}}';
    var ALLOW_TYPES = '{{ALLOW_TYPES}}';

    var TYPES = [];
    var raw = ALLOW_TYPES.split(',');
    for (var t = 0; t < raw.length; t++) {
        var trimmed = raw[t].trim();
        if (trimmed) {
            TYPES.push(trimmed);
        }
    }
    if (TYPES.length === 0) {
        TYPES = ['Movie', 'TV Show', 'Music', 'Other'];
    }

    function injectCSS() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '#' + OVERLAY_ID + ' {',
            '  position:fixed;inset:0;z-index:99999;',
            '  display:flex;align-items:center;justify-content:center;',
            '  background:rgba(0,0,0,0.72);',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-dialog {',
            '  background:#1a1a2a;border:1px solid rgba(255,255,255,0.1);',
            '  border-radius:12px;padding:28px 28px 24px;width:100%;max-width:480px;',
            '  box-shadow:0 20px 60px rgba(0,0,0,0.7);',
            '  font-family:inherit;color:#e0e0f0;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-title {',
            '  font-size:1.15em;font-weight:700;margin:0 0 20px;',
            '  color:#fff;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-field { margin-bottom:14px; }',
            '#' + OVERLAY_ID + ' .jfmr-label {',
            '  display:block;font-size:.8em;font-weight:600;',
            '  opacity:.6;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-input, #' + OVERLAY_ID + ' .jfmr-select {',
            '  width:100%;box-sizing:border-box;padding:9px 12px;border-radius:6px;',
            '  background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);',
            '  color:#e0e0f0;font-size:.9em;font-family:inherit;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-select { appearance:none;-webkit-appearance:none; }',
            '#' + OVERLAY_ID + ' .jfmr-input:focus, #' + OVERLAY_ID + ' .jfmr-select:focus { outline:none;border-color:' + ACCENT + '; }',
            '#' + OVERLAY_ID + ' .jfmr-actions { display:flex;gap:10px;justify-content:flex-end;margin-top:20px; }',
            '#' + OVERLAY_ID + ' .jfmr-btn {',
            '  padding:9px 20px;border-radius:6px;border:none;',
            '  cursor:pointer;font-size:.88em;font-weight:600;font-family:inherit;',
            '}',
            '#' + OVERLAY_ID + ' .jfmr-btn-cancel { background:rgba(255,255,255,0.08);color:#ccc; }',
            '#' + OVERLAY_ID + ' .jfmr-btn-submit { background:' + ACCENT + ';color:#fff; }',
            '#' + OVERLAY_ID + ' .jfmr-msg { font-size:.83em;margin-top:12px;text-align:center;min-height:1.2em; }',
            '#' + OVERLAY_ID + ' .jfmr-msg-ok  { color:#4ade80; }',
            '#' + OVERLAY_ID + ' .jfmr-msg-err { color:#f87171; }',
            
            /* Enhanced List & Admin View Styles */
            '#' + OVERLAY_ID + ' .jfmr-my-requests { margin-top:18px;border-top:1px solid rgba(255,255,255,0.07);padding-top:14px; }',
            '#' + OVERLAY_ID + ' .jfmr-my-title { font-size:.82em;font-weight:600;opacity:.5;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container { max-height:220px;overflow-y:auto;padding-right:8px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.2) transparent; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar { width:6px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar-track { background:rgba(255,255,255,0.05); border-radius:3px; }',
            '#' + OVERLAY_ID + ' .jfmr-list-container::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:3px; }',
            '#' + OVERLAY_ID + ' .jfmr-req-item { display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:5px;background:rgba(255,255,255,0.04);margin-bottom:6px;font-size:.83em; }',
            '#' + OVERLAY_ID + ' .jfmr-req-info { flex:1;min-width:0;display:flex;flex-direction:column; }',
            '#' + OVERLAY_ID + ' .jfmr-req-name { font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
            '#' + OVERLAY_ID + ' .jfmr-req-meta { font-size:.85em;opacity:.5;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }',
            '#' + OVERLAY_ID + ' .jfmr-req-actions { display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:10px; }',
            '#' + OVERLAY_ID + ' .jfmr-req-status { font-size:.78em;font-weight:600;padding:2px 7px;border-radius:3px; }',
            
            /* Admin Specific Controls */
            '#' + OVERLAY_ID + ' .jfmr-admin-sel { background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:3px 6px;font-size:.85em;font-family:inherit;appearance:none;-webkit-appearance:none;cursor:pointer; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-sel option { background:#222; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-del { background:#ef4444;border:none;color:#fff;border-radius:4px;padding:3px 8px;cursor:pointer;font-weight:bold;font-size:.9em; }',
            '#' + OVERLAY_ID + ' .jfmr-admin-del:hover { background:#dc2626; }',

            '#' + OVERLAY_ID + ' .jfmr-status-pending   { background:rgba(251,191,36,0.15);color:#fbbf24; }',
            '#' + OVERLAY_ID + ' .jfmr-status-approved  { background:rgba(74,222,128,0.15);color:#4ade80; }',
            '#' + OVERLAY_ID + ' .jfmr-status-declined  { background:rgba(248,113,113,0.15);color:#f87171; }',
            '#' + OVERLAY_ID + ' .jfmr-status-available { background:rgba(96,165,250,0.15);color:#60a5fa; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    function getCurrentUser() {
        if (typeof ApiClient === 'undefined') {
            return { id: '', name: '' };
        }
        var id   = ApiClient.getCurrentUserId()    || '';
        var info = ApiClient.getCurrentUser && ApiClient.getCurrentUser();
        var name = (info && info.Name) ? info.Name : '';
        return { id: id, name: name };
    }

    function statusClass(status) {
        if (status === 'approved')  { return 'jfmr-status-approved'; }
        if (status === 'declined')  { return 'jfmr-status-declined'; }
        if (status === 'available') { return 'jfmr-status-available'; }
        return 'jfmr-status-pending';
    }

    function openDialog() {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        var user = getCurrentUser();

        var overlay = document.createElement('div');
        overlay.id  = OVERLAY_ID;

        var dialog = document.createElement('div');
        dialog.className = 'jfmr-dialog';
        dialog.setAttribute('role', 'dialog');

        var titleEl = document.createElement('div');
        titleEl.className   = 'jfmr-title';
        titleEl.textContent = 'Request Media';
        dialog.appendChild(titleEl);

        function field(labelText, input) {
            var wrap  = document.createElement('div');
            wrap.className = 'jfmr-field';
            var lbl = document.createElement('label');
            lbl.className   = 'jfmr-label';
            lbl.textContent = labelText;
            wrap.appendChild(lbl);
            wrap.appendChild(input);
            return wrap;
        }

        var titleInput = document.createElement('input');
        titleInput.type        = 'text';
        titleInput.className   = 'jfmr-input';
        titleInput.placeholder = 'e.g. The Dark Knight';
        dialog.appendChild(field('Title *', titleInput));

        var typeSelect = document.createElement('select');
        typeSelect.className = 'jfmr-select';
        for (var i = 0; i < TYPES.length; i++) {
            var opt = document.createElement('option');
            opt.value       = TYPES[i];
            opt.textContent = TYPES[i];
            typeSelect.appendChild(opt);
        }
        dialog.appendChild(field('Type *', typeSelect));

        var yearInput = document.createElement('input');
        yearInput.type        = 'text';
        yearInput.className   = 'jfmr-input';
        yearInput.maxLength   = 4;
        yearInput.placeholder = 'e.g. 2024';
        dialog.appendChild(field('Year (optional)', yearInput));

        var noteInput = document.createElement('textarea');
        noteInput.className   = 'jfmr-input';
        noteInput.rows        = 2;
        noteInput.placeholder = 'Any extra details...';
        noteInput.style.resize = 'vertical';
        dialog.appendChild(field('Notes (optional)', noteInput));

        var msgEl = document.createElement('div');
        msgEl.className = 'jfmr-msg';
        dialog.appendChild(msgEl);

        var actions = document.createElement('div');
        actions.className = 'jfmr-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.className   = 'jfmr-btn jfmr-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = function () {
            closeDialog();
        };

        var submitBtn = document.createElement('button');
        submitBtn.className   = 'jfmr-btn jfmr-btn-submit';
        submitBtn.textContent = 'Submit Request';
        submitBtn.onclick = function () {
            var titleVal = titleInput.value.trim();
            var typeVal  = typeSelect.value;
            if (!titleVal) {
                msgEl.className   = 'jfmr-msg jfmr-msg-err';
                msgEl.textContent = 'Please enter a title.';
                return;
            }
            submitBtn.disabled  = true;
            msgEl.className     = 'jfmr-msg';
            msgEl.textContent   = 'Submitting...';

            fetch(API + '/requests', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    title:    titleVal,
                    type:     typeVal,
                    year:     yearInput.value.trim(),
                    note:     noteInput.value.trim(),
                    userId:   user.id,
                    userName: user.name
                })
            }).then(function (r) {
                return r.json();
            }).then(function (data) {
                if (data.ok) {
                    msgEl.className   = 'jfmr-msg jfmr-msg-ok';
                    msgEl.textContent = 'Request submitted! We will review it soon.';
                    titleInput.value  = '';
                    yearInput.value   = '';
                    noteInput.value   = '';
                    submitBtn.disabled = false;
                    loadMyRequests(myRequestsList, user, myTitle);
                } else {
                    msgEl.className   = 'jfmr-msg jfmr-msg-err';
                    msgEl.textContent = data.error || 'Submission failed.';
                    submitBtn.disabled = false;
                }
            }).catch(function () {
                msgEl.className   = 'jfmr-msg jfmr-msg-err';
                msgEl.textContent = 'Network error. Please try again.';
                submitBtn.disabled = false;
            });
        };

        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        dialog.appendChild(actions);

        var myRequestsWrap = document.createElement('div');
        myRequestsWrap.className = 'jfmr-my-requests';

        var myTitle = document.createElement('div');
        myTitle.className   = 'jfmr-my-title';
        myTitle.textContent = 'Loading requests...';
        myRequestsWrap.appendChild(myTitle);

        var myRequestsList = document.createElement('div');
        myRequestsList.className = 'jfmr-list-container';
        myRequestsWrap.appendChild(myRequestsList);
        dialog.appendChild(myRequestsWrap);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        titleInput.focus();
        loadMyRequests(myRequestsList, user, myTitle);
    }

    function loadMyRequests(container, user, titleElement) {
        container.innerHTML = '<div style="font-size:.8em;opacity:.4;padding:4px 0;text-align:center;">Loading database...</div>';
        
        fetch(API + '/requests?userId=' + encodeURIComponent(user.id))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var list = data.requests || [];
                var isAdmin = data.isAdmin === true;

                if (titleElement) {
                    titleElement.textContent = isAdmin ? 'All Requests (Admin View)' : 'Your previous requests';
                }

                if (list.length === 0) {
                    container.innerHTML = '<div style="font-size:.8em;opacity:.35;padding:4px 0;text-align:center;">No requests found.</div>';
                    return;
                }
                
                container.innerHTML = '';
                for (var j = list.length - 1; j >= 0; j--) {
                    var req = list[j];
                    
                    var row = document.createElement('div');
                    row.className = 'jfmr-req-item';

                    var infoCol = document.createElement('div');
                    infoCol.className = 'jfmr-req-info';

                    var nameEl = document.createElement('div');
                    nameEl.className = 'jfmr-req-name';
                    nameEl.textContent = req.title;

                    var metaEl = document.createElement('div');
                    metaEl.className = 'jfmr-req-meta';
                    var metaText = req.type;
                    if (req.year) { metaText += ' (' + req.year + ')'; }
                    if (isAdmin && req.userName) { metaText += ' • Req by: ' + req.userName; }
                    metaEl.textContent = metaText;

                    infoCol.appendChild(nameEl);
                    infoCol.appendChild(metaEl);
                    row.appendChild(infoCol);

                    var actionsCol = document.createElement('div');
                    actionsCol.className = 'jfmr-req-actions';

                    if (isAdmin) {
                        var sel = document.createElement('select');
                        sel.className = 'jfmr-admin-sel';
                        var opts = ['pending', 'approved', 'declined', 'available'];
                        for (var o = 0; o < opts.length; o++) {
                            var opt = document.createElement('option');
                            opt.value = opts[o];
                            opt.textContent = opts[o].charAt(0).toUpperCase() + opts[o].slice(1);
                            sel.appendChild(opt);
                        }
                        sel.value = req.status;

                        // Use IIFE to lock in the current Request ID during iteration
                        (function(currentId, selectBox) {
                            selectBox.onchange = function() {
                                selectBox.disabled = true;
                                fetch(API + '/requests/' + currentId, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: selectBox.value, adminId: user.id })
                                }).then(function() {
                                    loadMyRequests(container, user, titleElement);
                                });
                            };
                        })(req.id, sel);

                        var delBtn = document.createElement('button');
                        delBtn.className = 'jfmr-admin-del';
                        delBtn.innerHTML = '&times;';
                        delBtn.title = 'Delete Request';
                        
                        (function(currentId, deleteButton) {
                            deleteButton.onclick = function() {
                                if (!confirm('Are you sure you want to delete this request permanently?')) return;
                                deleteButton.disabled = true;
                                fetch(API + '/requests/' + currentId + '?adminId=' + encodeURIComponent(user.id), {
                                    method: 'DELETE'
                                }).then(function() {
                                    loadMyRequests(container, user, titleElement);
                                });
                            };
                        })(req.id, delBtn);

                        actionsCol.appendChild(sel);
                        actionsCol.appendChild(delBtn);
                    } else {
                        var badge = document.createElement('div');
                        badge.className = 'jfmr-req-status ' + statusClass(req.status);
                        badge.textContent = req.status.charAt(0).toUpperCase() + req.status.slice(1);
                        actionsCol.appendChild(badge);
                    }

                    row.appendChild(actionsCol);
                    container.appendChild(row);
                }
            }).catch(function () {
                container.innerHTML = '<div style="font-size:.8em;opacity:.35;padding:4px 0;text-align:center;">Could not load requests database.</div>';
            });
    }

    function closeDialog() {
        var el = document.getElementById(OVERLAY_ID);
        if (el) {
            el.remove();
        }
    }

    function addNavButton() {
        if (document.getElementById(BTN_ID)) {
            return;
        }
        var libraryMenuOptions = document.querySelector('.libraryMenuOptions');
        if (!libraryMenuOptions) {
            return;
        }

        var btn = document.createElement('a');
        btn.id   = BTN_ID;
        btn.href = '#';
        btn.className = 'navMenuOption emby-button';

        var icon = document.createElement('span');
        icon.className   = 'material-icons navMenuOptionIcon';
        icon.textContent = 'add_box';
        icon.setAttribute('aria-hidden', 'true');

        var label = document.createElement('span');
        label.className   = 'navMenuOptionText';
        label.textContent = MENU_LABEL || 'Request Media';

        btn.appendChild(icon);
        btn.appendChild(label);

        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            openDialog();
        };

        libraryMenuOptions.appendChild(btn);
    }

    function init() {
        injectCSS();
        addNavButton();
    }

    var _observer = null;

    function watchForDrawer() {
        if (_observer) {
            return;
        }
        _observer = new MutationObserver(function () {
            addNavButton();
        });
        _observer.observe(document.body, { childList: true, subtree: true });
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForDrawer);
    } else {
        setTimeout(watchForDrawer, 500);
    }

})();
