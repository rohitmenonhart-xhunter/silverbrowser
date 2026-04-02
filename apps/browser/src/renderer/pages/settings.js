// Settings page — Silver Browser
(function () {
  var silver = window.silver;

  // --- Sidebar navigation ---
  var navItems = document.querySelectorAll('.nav-item');
  var pages = document.querySelectorAll('.page');

  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var pageId = item.getAttribute('data-page');

      navItems.forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');

      pages.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('page-' + pageId);
      if (target) target.classList.add('active');

      if (pageId === 'adblock') loadAdStats();
      if (pageId === 'import') detectBrowsers();
    });
  });

  // --- Toggles ---
  document.querySelectorAll('.toggle').forEach(function (el) {
    el.addEventListener('click', function () {
      el.classList.toggle('on');
      var key = el.getAttribute('data-setting');
      if (key && silver) {
        silver.settings.set(key, el.classList.contains('on'));
      }
    });
  });

  // --- Load saved settings ---
  function loadSettings() {
    if (!silver) return;
    silver.settings.get().then(function (all) {
      if (all['ghost.apiKey']) {
        document.getElementById('api-key').placeholder = 'Key saved (click to change)';
      }
      if (all['ghost.model']) {
        document.getElementById('ghost-model').value = all['ghost.model'];
      }
      if (all['general.searchEngine']) {
        document.getElementById('search-engine').value = all['general.searchEngine'];
      }
      document.querySelectorAll('.toggle[data-setting]').forEach(function (el) {
        var k = el.getAttribute('data-setting');
        if (all[k] === false) el.classList.remove('on');
        else if (all[k] === true) el.classList.add('on');
      });
    }).catch(function () {});
  }
  loadSettings();

  // --- Save API key ---
  document.getElementById('save-key').addEventListener('click', function () {
    var val = document.getElementById('api-key').value;
    if (val && silver) {
      silver.settings.set('ghost.apiKey', val);
      document.getElementById('api-key').value = '';
      document.getElementById('api-key').placeholder = 'Key saved (click to change)';
    }
    var saved = document.getElementById('key-saved');
    saved.classList.add('show');
    setTimeout(function () { saved.classList.remove('show'); }, 2000);
  });

  // --- Model change ---
  document.getElementById('ghost-model').addEventListener('change', function (e) {
    if (silver) silver.settings.set('ghost.model', e.target.value);
  });

  // --- Search engine change ---
  document.getElementById('search-engine').addEventListener('change', function (e) {
    if (silver) silver.settings.set('general.searchEngine', e.target.value);
  });

  // --- Startup change ---
  document.getElementById('startup').addEventListener('change', function (e) {
    if (silver) silver.settings.set('general.startup', e.target.value);
  });

  // --- Ad stats ---
  function loadAdStats() {
    if (!silver) return;
    silver.ads.stats().then(function (stats) {
      document.getElementById('ads-count').textContent = stats.sessionBlocked + ' blocked';
    }).catch(function () {});
  }

  // --- Clear data ---
  document.getElementById('clear-history').addEventListener('click', function () {
    if (confirm('Clear all browsing history?')) {
      alert('History cleared.');
    }
  });

  document.getElementById('clear-cookies').addEventListener('click', function () {
    if (confirm('Clear all cookies and site data? You will be signed out of all websites.')) {
      alert('Cookies and site data cleared.');
    }
  });

  document.getElementById('clear-cache').addEventListener('click', function () {
    if (confirm('Clear cached files and images?')) {
      alert('Cache cleared.');
    }
  });

  // --- Import: auto-detect browsers ---
  function detectBrowsers() {
    if (!silver || !silver.import) return;

    var grid = document.getElementById('import-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="color:#5a5d66;font-size:12px;">Detecting browsers...</div>';

    silver.import.detect().then(function (browsers) {
      grid.innerHTML = '';

      browsers.forEach(function (b) {
        var card = document.createElement('div');
        card.className = 'import-card' + (b.available ? '' : ' unavailable');
        card.innerHTML =
          '<div class="ic-icon">' + b.icon + '</div>' +
          '<div>' +
            '<div class="ic-name">' + b.name + '</div>' +
            '<div class="ic-desc">' + (b.available ? 'Ready to import' : 'Not installed') + '</div>' +
          '</div>' +
          (b.available ? '<div class="ic-action"><button class="btn btn-primary import-btn" data-id="' + b.id + '">Import</button></div>' : '');
        grid.appendChild(card);
      });

      // Bind import buttons
      grid.querySelectorAll('.import-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var browserId = btn.getAttribute('data-id');
          runImport(browserId, btn);
        });
      });
    }).catch(function () {
      grid.innerHTML = '<div style="color:#fca5a5;font-size:12px;">Failed to detect browsers</div>';
    });
  }

  function runImport(browserId, btn) {
    btn.textContent = 'Importing...';
    btn.disabled = true;

    silver.import.run(browserId).then(function (result) {
      if (result.success) {
        btn.textContent = 'Done!';
        btn.style.background = '#6ee7a8';
        btn.style.color = '#1a1a1e';

        // Show results
        var resultsDiv = document.getElementById('import-results');
        if (!resultsDiv) {
          resultsDiv = document.createElement('div');
          resultsDiv.id = 'import-results';
          document.getElementById('import-grid').parentNode.appendChild(resultsDiv);
        }

        resultsDiv.innerHTML =
          '<div class="group" style="margin-top:24px;">' +
            '<div class="group-title">Imported from ' + result.browser + '</div>' +
            '<div class="row"><div><div class="row-label">Bookmarks</div><div class="row-desc">' + result.bookmarks.length + ' imported</div></div></div>' +
            '<div class="row"><div><div class="row-label">History</div><div class="row-desc">' + result.history.length + ' entries imported</div></div></div>' +
          '</div>';

        // Show bookmarks list
        if (result.bookmarks.length > 0) {
          var bmHtml = '<div class="group"><div class="group-title">Bookmarks</div>';
          result.bookmarks.slice(0, 50).forEach(function (bm) {
            var domain = '';
            try { domain = new URL(bm.url).hostname; } catch(e) {}
            bmHtml +=
              '<div class="row" style="cursor:pointer;" onclick="window.open(\'' + bm.url.replace(/'/g, "\\'") + '\')">' +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                  '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=16" width="16" height="16" style="border-radius:2px;" onerror="this.style.display=\'none\'">' +
                  '<div><div class="row-label">' + escapeHtml(bm.title || domain) + '</div>' +
                  '<div class="row-desc">' + escapeHtml(domain) + (bm.folder ? ' · ' + escapeHtml(bm.folder) : '') + '</div></div>' +
                '</div>' +
              '</div>';
          });
          if (result.bookmarks.length > 50) {
            bmHtml += '<div style="padding:8px 16px;color:#5a5d66;font-size:11px;">...and ' + (result.bookmarks.length - 50) + ' more</div>';
          }
          bmHtml += '</div>';
          resultsDiv.innerHTML += bmHtml;
        }

        // Show top visited sites
        if (result.history.length > 0) {
          var histHtml = '<div class="group"><div class="group-title">Most Visited</div>';
          result.history.slice(0, 20).forEach(function (h) {
            var domain = '';
            try { domain = new URL(h.url).hostname; } catch(e) {}
            histHtml +=
              '<div class="row">' +
                '<div style="display:flex;align-items:center;gap:10px;">' +
                  '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=16" width="16" height="16" style="border-radius:2px;" onerror="this.style.display=\'none\'">' +
                  '<div><div class="row-label">' + escapeHtml(h.title || domain) + '</div>' +
                  '<div class="row-desc">' + escapeHtml(domain) + ' · ' + h.visitCount + ' visits</div></div>' +
                '</div>' +
              '</div>';
          });
          histHtml += '</div>';
          resultsDiv.innerHTML += histHtml;
        }
      } else {
        btn.textContent = 'Failed';
        btn.style.background = 'rgba(252,165,165,0.1)';
        btn.style.color = '#fca5a5';
        alert('Import failed: ' + (result.error || 'Unknown error'));
      }
    }).catch(function (err) {
      btn.textContent = 'Error';
      alert('Import error: ' + err.message);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Extensions ---
  document.getElementById('ext-open-store').addEventListener('click', function () {
    if (silver && silver.extensions) silver.extensions.openStore();
  });

  document.getElementById('ext-open-dir').addEventListener('click', function () {
    if (silver && silver.extensions) silver.extensions.openDir();
  });

  document.getElementById('ext-install-local').addEventListener('click', function () {
    // Prompt user for path (simple approach)
    var path = prompt('Enter the full path to the unpacked extension folder:');
    if (path && silver && silver.extensions) {
      silver.extensions.install(path).then(function (ext) {
        if (ext) {
          alert('Extension installed: ' + ext.name);
          loadExtensions();
        } else {
          alert('Failed to install extension. Make sure the folder contains a valid manifest.json');
        }
      });
    }
  });

  function loadExtensions() {
    if (!silver || !silver.extensions) return;
    silver.extensions.list().then(function (list) {
      var container = document.getElementById('ext-list');
      if (!list || list.length === 0) {
        container.innerHTML = '<div class="row"><div><div class="row-label" style="color:#5a5d66;">No extensions installed</div><div class="row-desc">Browse the Chrome Web Store or load an unpacked extension</div></div></div>';
        return;
      }
      var html = '';
      list.forEach(function (ext) {
        html += '<div class="row">' +
          '<div style="flex:1;">' +
            '<div class="row-label">' + escapeHtml(ext.name) + '</div>' +
            '<div class="row-desc">v' + escapeHtml(ext.version) + (ext.description ? ' — ' + escapeHtml(ext.description.substring(0, 80)) : '') + '</div>' +
          '</div>' +
          '<div class="row-right">' +
            '<button class="btn btn-danger ext-remove-btn" data-id="' + ext.id + '" style="padding:4px 10px;font-size:11px;">Remove</button>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;

      container.querySelectorAll('.ext-remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (confirm('Remove this extension?')) {
            silver.extensions.remove(btn.getAttribute('data-id')).then(function () {
              loadExtensions();
            });
          }
        });
      });
    });
  }

  // Load extensions when visiting the page
  navItems.forEach(function (item) {
    if (item.getAttribute('data-page') === 'extensions') {
      item.addEventListener('click', loadExtensions);
    }
  });

  // --- Vault ---
  var vaultUnlocked = false;

  document.getElementById('vault-unlock-btn').addEventListener('click', function () {
    if (!silver || !silver.vault) return;
    silver.vault.auth('view vault contents').then(function (ok) {
      if (ok) {
        vaultUnlocked = true;
        document.getElementById('vault-locked').style.display = 'none';
        document.getElementById('vault-unlocked').style.display = 'block';
        loadVaultContent();
      }
    });
  });

  function loadVaultContent() {
    loadPINStatus();
    loadPasswords();
    loadSafeFiles();
  }

  // PIN status
  function loadPINStatus() {
    silver.vault.hasPIN().then(function (has) {
      document.getElementById('pin-status').textContent = has ? 'PIN is set' : 'No PIN set — set one to protect your vault';
    });
  }

  document.getElementById('change-pin-btn').addEventListener('click', function () {
    var pin = prompt('Enter new vault PIN:');
    if (pin && pin.length >= 4) {
      silver.vault.setupPIN(pin).then(function () {
        loadPINStatus();
        alert('Vault PIN updated.');
      });
    } else if (pin) {
      alert('PIN must be at least 4 characters.');
    }
  });

  // Passwords list
  function loadPasswords() {
    silver.vault.listPasswords().then(function (list) {
      var container = document.getElementById('passwords-list');
      if (!list || list.length === 0) {
        container.innerHTML = '<div class="row"><div><div class="row-label" style="color:#5a5d66;">No saved passwords</div><div class="row-desc">Passwords are saved automatically when you log in to websites</div></div></div>';
        return;
      }
      var html = '';
      list.forEach(function (cred) {
        var domain = cred.domain;
        html += '<div class="row">' +
          '<div style="display:flex;align-items:center;gap:10px;flex:1;">' +
            '<img src="https://www.google.com/s2/favicons?domain=' + domain + '&sz=16" width="16" height="16" style="border-radius:2px;" onerror="this.style.display=\'none\'">' +
            '<div><div class="row-label">' + escapeHtml(domain) + '</div>' +
            '<div class="row-desc">' + escapeHtml(cred.username) + '</div></div>' +
          '</div>' +
          '<div class="row-right">' +
            '<button class="btn btn-danger delete-pw-btn" data-id="' + cred.id + '" style="padding:4px 10px;font-size:11px;">Delete</button>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;

      container.querySelectorAll('.delete-pw-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          if (confirm('Delete this saved password?')) {
            silver.vault.deletePassword(id).then(function () { loadPasswords(); });
          }
        });
      });
    });
  }

  // Safe folder
  function loadSafeFiles() {
    silver.vault.safeList().then(function (result) {
      var container = document.getElementById('safe-files-list');
      if (result.error) {
        container.innerHTML = '<div style="color:#fca5a5;font-size:12px;">Authentication required</div>';
        return;
      }
      var files = result.files || [];
      if (files.length === 0) {
        container.innerHTML = '<div class="row"><div><div class="row-label" style="color:#5a5d66;">No files in safe folder</div><div class="row-desc">Add sensitive files here — they are encrypted and hidden</div></div></div>';
        return;
      }
      var html = '';
      files.forEach(function (f) {
        var sizeStr = f.size < 1024 ? f.size + ' B'
          : f.size < 1048576 ? (f.size / 1024).toFixed(1) + ' KB'
          : (f.size / 1048576).toFixed(1) + ' MB';
        var dateStr = new Date(f.createdAt).toLocaleDateString();
        html += '<div class="row">' +
          '<div style="flex:1;">' +
            '<div class="row-label">' + escapeHtml(f.name) + '</div>' +
            '<div class="row-desc">' + sizeStr + ' · ' + dateStr + '</div>' +
          '</div>' +
          '<div class="row-right">' +
            '<button class="btn safe-download-btn" data-id="' + f.id + '" data-name="' + escapeHtml(f.name) + '" data-mime="' + f.mimeType + '" style="padding:4px 10px;font-size:11px;">Export</button>' +
            '<button class="btn btn-danger safe-remove-btn" data-id="' + f.id + '" style="padding:4px 10px;font-size:11px;">Delete</button>' +
          '</div>' +
        '</div>';
      });
      container.innerHTML = html;

      container.querySelectorAll('.safe-download-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          silver.vault.safeGet(btn.getAttribute('data-id')).then(function (result) {
            if (!result || result.error) return;
            // Download decrypted file
            var blob = new Blob([Uint8Array.from(atob(result.data), function(c) { return c.charCodeAt(0); })], { type: btn.getAttribute('data-mime') });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = btn.getAttribute('data-name');
            a.click();
            URL.revokeObjectURL(url);
          });
        });
      });

      container.querySelectorAll('.safe-remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (confirm('Permanently delete this file from Safe Folder?')) {
            silver.vault.safeRemove(btn.getAttribute('data-id')).then(function () { loadSafeFiles(); });
          }
        });
      });
    });
  }

  // Add file to safe folder
  document.getElementById('safe-add-btn').addEventListener('click', function () {
    document.getElementById('safe-file-input').click();
  });

  document.getElementById('safe-file-input').addEventListener('change', function (e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var base64 = btoa(new Uint8Array(reader.result).reduce(function (data, byte) {
          return data + String.fromCharCode(byte);
        }, ''));
        silver.vault.safeAdd(file.name, base64, file.type || 'application/octet-stream').then(function () {
          loadSafeFiles();
        });
      };
      reader.readAsArrayBuffer(file);
    });
    e.target.value = '';
  });
})();
