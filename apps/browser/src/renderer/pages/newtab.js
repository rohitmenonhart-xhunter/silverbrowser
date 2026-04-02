(function () {
  var silver = window.silver;
  var mode = 'web'; // 'web' or 'ai'

  // Greeting
  var hour = new Date().getHours();
  var greet = hour < 5 ? 'Late night'
    : hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : hour < 21 ? 'Good evening'
    : 'Good night';
  document.getElementById('greeting').textContent = greet;

  var date = new Date();
  document.getElementById('greeting-sub').textContent =
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Auto-resize textarea
  var prompt = document.getElementById('prompt');
  var submit = document.getElementById('submit');

  prompt.addEventListener('input', function () {
    prompt.style.height = 'auto';
    prompt.style.height = Math.min(prompt.scrollHeight, 160) + 'px';
    // Toggle submit button style
    if (prompt.value.trim()) {
      submit.classList.add('ready');
    } else {
      submit.classList.remove('ready');
    }
  });

  // Mode toggle
  var modeAIBtn = document.getElementById('mode-ai');
  var modeWeb = document.getElementById('mode-web');
  var aiWrap = document.getElementById('mode-ai-wrap');
  var dropdown = document.getElementById('ai-dropdown');
  var aiLabel = document.getElementById('ai-label');
  var selectedAI = 'claude'; // default

  // Toggle dropdown
  modeAIBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = aiWrap.classList.contains('open');

    if (mode === 'ai' && !isOpen) {
      // Already in AI mode, toggle dropdown
      aiWrap.classList.add('open');
    } else if (mode !== 'ai') {
      // Switch to AI mode
      mode = 'ai';
      modeAIBtn.classList.add('active');
      modeWeb.classList.remove('active');
      updateAIPlaceholder();
      prompt.focus();
      // Show dropdown to let them pick
      aiWrap.classList.add('open');
    } else {
      aiWrap.classList.remove('open');
    }
  });

  // AI option selection
  document.querySelectorAll('.ai-option').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      e.stopPropagation();
      selectedAI = opt.getAttribute('data-ai');

      // Update selected state
      document.querySelectorAll('.ai-option').forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');

      // Update label
      var name = opt.querySelector('.ai-option-name').textContent;
      aiLabel.textContent = name;

      // Set mode and close
      mode = 'ai';
      modeAIBtn.classList.add('active');
      modeWeb.classList.remove('active');
      aiWrap.classList.remove('open');
      updateAIPlaceholder();
      prompt.focus();
    });
  });

  // Web mode
  modeWeb.addEventListener('click', function () {
    mode = 'web';
    modeWeb.classList.add('active');
    modeAIBtn.classList.remove('active');
    aiWrap.classList.remove('open');
    prompt.placeholder = 'Search the web...';
    prompt.focus();
  });

  // Close dropdown on outside click
  document.addEventListener('click', function () {
    aiWrap.classList.remove('open');
  });

  function updateAIPlaceholder() {
    var names = { claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Gemini' };
    prompt.placeholder = 'Ask ' + (names[selectedAI] || 'AI') + ' anything...';
  }

  // Set Claude as default selected
  document.querySelector('.ai-option[data-ai="claude"]').classList.add('selected');

  // Submit
  function handleSubmit() {
    var q = prompt.value.trim();
    if (!q) return;

    if (mode === 'ai') {
      // Store the query — we'll auto-submit after page loads
      if (silver && silver.settings) {
        silver.settings.set('_ai_autosubmit', q);
        silver.settings.set('_ai_provider', selectedAI);
      }
      var urls = {
        claude: 'https://claude.ai/new',
        chatgpt: 'https://chatgpt.com/',
        gemini: 'https://gemini.google.com/app',
      };
      window.location.href = urls[selectedAI] || urls.claude;
    } else {
      // Web search
      if (q.includes('.') && !q.includes(' ')) {
        window.location.href = q.startsWith('http') ? q : 'https://' + q;
      } else {
        window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
      }
    }
  }

  prompt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  submit.addEventListener('click', handleSubmit);
  prompt.focus();

  // Sites
  function loadSites() {
    if (!silver || !silver.import) return;
    silver.import.getData().then(function (data) {
      var grid = document.getElementById('sites');
      var history = data.history || [];

      if (history.length === 0) {
        grid.innerHTML = '<div class="empty">Import browsing data from Settings to see your top sites</div>';
        return;
      }

      var map = {};
      history.forEach(function (h) {
        try {
          var d = new URL(h.url).hostname;
          if (!map[d]) map[d] = { url: h.url, title: h.title || d, domain: d, visits: 0 };
          map[d].visits += h.visitCount || 1;
        } catch (e) {}
      });

      var sites = Object.values(map).sort(function (a, b) { return b.visits - a.visits; }).slice(0, 12);
      grid.innerHTML = '';
      sites.forEach(function (s) {
        var a = document.createElement('a');
        a.className = 'site';
        a.href = s.url;
        var name = s.domain.replace('www.', '').split('.')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
        a.innerHTML =
          '<div class="site-icon"><img src="https://www.google.com/s2/favicons?domain=' + s.domain + '&sz=64" onerror="this.parentElement.textContent=\'' + name.charAt(0) + '\'"></div>' +
          '<div class="site-name">' + name + '</div>';
        grid.appendChild(a);
      });
    }).catch(function () {});
  }
  loadSites();

  // Theme
  var isDark = true;
  if (silver && silver.settings) {
    silver.settings.get('general.theme').then(function (saved) {
      if (saved === 'light') { isDark = false; applyTheme(); }
    }).catch(function () {});
  }

  function applyTheme() {
    if (isDark) {
      document.body.classList.remove('light');
      document.getElementById('icon-sun').style.display = '';
      document.getElementById('icon-moon').style.display = 'none';
    } else {
      document.body.classList.add('light');
      document.getElementById('icon-sun').style.display = 'none';
      document.getElementById('icon-moon').style.display = '';
    }
  }

  document.getElementById('theme-toggle').addEventListener('click', function () {
    isDark = !isDark;
    applyTheme();
    if (silver && silver.settings) silver.settings.set('general.theme', isDark ? 'dark' : 'light');
  });
})();
