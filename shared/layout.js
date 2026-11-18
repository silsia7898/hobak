/* 호박 (Hobak) - Shared Header & Footer Renderer */
(function (global) {
  function getLemonLogoSvg(size = 28) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Stem & Fresh Lime Leaf -->
      <path d="M18 4.5C18.5 3 20 2.5 21 3.5" stroke="#3CA31E" stroke-width="2" stroke-linecap="round"/>
      <path d="M18.5 5.5C21.5 2.5 26 3.5 27 6.8C24.2 8.2 20.5 7.8 18.5 5.5Z" fill="#5CD636"/>
      <!-- Bright Canary Yellow Lemon Body -->
      <path d="M6.5 18.5C6.5 11.8 11.4 7.5 18 7.5C24.6 7.5 29.5 11.8 29.5 18.5C29.5 25.2 24.6 29.5 18 29.5C11.4 29.5 6.5 25.2 6.5 18.5Z" fill="#FFE600" stroke="#D9B800" stroke-width="1.6"/>
      <!-- Lemon Tips -->
      <circle cx="5.6" cy="18.5" r="2.2" fill="#FFE600" stroke="#D9B800" stroke-width="1.4"/>
      <circle cx="30.4" cy="18.5" r="2.2" fill="#FFE600" stroke="#D9B800" stroke-width="1.4"/>
      <!-- Highlight -->
      <ellipse cx="13" cy="12.5" rx="3.2" ry="1.4" transform="rotate(-25 13 12.5)" fill="#FFF4A8"/>
      <!-- Cute Character Face -->
      <circle cx="14" cy="18" r="1.5" fill="#3B2F00"/>
      <circle cx="22" cy="18" r="1.5" fill="#3B2F00"/>
      <ellipse cx="11.5" cy="20.2" rx="2" ry="1.1" fill="#FF9E80" opacity="0.75"/>
      <ellipse cx="24.5" cy="20.2" rx="2" ry="1.1" fill="#FF9E80" opacity="0.75"/>
      <path d="M15.6 21.2C16.6 22.8 19.4 22.8 20.4 21.2" stroke="#3B2F00" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  function getPumpkinLogoSvg(size = 28) {
    return getLemonLogoSvg(size);
  }

  function renderHeader(targetId, options = {}) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const {
      homeHref = 'index.html',
      writeHref = 'write.html',
      searchValue = '',
      showSearch = true,
      onSearch = null
    } = options;

    el.innerHTML = `
      <header class="hobak-header">
        <div class="hobak-header-inner">
          <a href="${homeHref}" class="hobak-logo" aria-label="상큼이 홈">
            ${getLemonLogoSvg(32)}
            <span>상큼이</span>
          </a>
          ${showSearch ? `
          <form class="hobak-search-form" id="hobak-global-search-form">
            <input
              type="search"
              class="hobak-search-input"
              id="hobak-global-search-input"
              placeholder="물품이나 동네를 검색해보세요"
              value="${String(searchValue).replace(/"/g, '&quot;')}"
              aria-label="검색어 입력"
            />
            <button type="submit" class="hobak-search-btn" aria-label="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>` : '<div style="flex:1"></div>'}
          <div class="hobak-header-actions" id="hobak-header-actions">
            <button type="button" id="hobak-login-btn" class="hobak-btn-primary">로그인</button>
          </div>
        </div>
      </header>
    `;

    ensureAuthModal();
    renderHeaderActions();
    bindWriteLinkGuard();

    if (!renderHeader._authBound) {
      global.addEventListener('hobak:authchange', renderHeaderActions);
      renderHeader._authBound = true;
    }

    if (global.HobakStore && typeof global.HobakStore.initAuth === 'function') {
      global.HobakStore.initAuth();
    }

    if (showSearch) {
      const form = document.getElementById('hobak-global-search-form');
      const input = document.getElementById('hobak-global-search-input');
      if (form && input) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          if (typeof onSearch === 'function') {
            onSearch(input.value.trim());
          } else {
            const q = encodeURIComponent(input.value.trim());
            window.location.href = `${homeHref}${q ? '?q=' + q : ''}`;
          }
        });
      }
    }
  }

  function renderFooter(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.innerHTML = `
      <footer class="hobak-footer">
        <div class="hobak-footer-inner">
          <div class="hobak-footer-top">
            <div>
              <div class="hobak-logo" style="margin-bottom:10px;">
                ${getLemonLogoSvg(26)}
                <span>상큼이</span>
              </div>
              <p style="margin:0;color:var(--hobak-text-muted);font-size:13px;">
                우리 동네 상큼한 직거래, 상큼이마켓
              </p>
            </div>
            <div class="hobak-footer-cols">
              <div class="hobak-footer-col">
                <h4>회사</h4>
                <ul>
                  <li><a href="#about" onclick="return false;">회사 소개</a></li>
                  <li><a href="#blog" onclick="return false;">상큼이 블로그</a></li>
                  <li><a href="#jobs" onclick="return false;">채용 정보</a></li>
                </ul>
              </div>
              <div class="hobak-footer-col">
                <h4>탐색</h4>
                <ul>
                  <li><a href="index.html">중고거래</a></li>
                  <li><a href="write.html">내 물건 팔기</a></li>
                  <li><a href="#local" onclick="return false;">동네업체</a></li>
                </ul>
              </div>
              <div class="hobak-footer-col">
                <h4>비즈니스</h4>
                <ul>
                  <li><a href="#ad" onclick="return false;">상큼이비즈니스</a></li>
                  <li><a href="#chat" onclick="return false;">채팅하기</a></li>
                </ul>
              </div>
              <div class="hobak-footer-col">
                <h4>문의</h4>
                <ul>
                  <li><a href="#help" onclick="return false;">자주 묻는 질문</a></li>
                  <li><a href="#cs" onclick="return false;">고객센터</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="hobak-footer-bottom">
            <div><strong>(주) 상큼이마켓</strong> · 대표: 팀장 · 사업자등록번호: 123-45-67890 · 울산광역시 동구 방어동</div>
            <div>이용약관 · <strong>개인정보처리방침</strong> · 운영정책 · 청소년보호정책</div>
          </div>
        </div>
      </footer>
    `;
  }

  let authModalState = {
    mode: 'login',
    onSuccess: null
  };

  function escapeText(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderHeaderActions() {
    const actionsEl = document.getElementById('hobak-header-actions');
    if (!actionsEl) return;
    const user = global.HobakStore && global.HobakStore.getCurrentUser
      ? global.HobakStore.getCurrentUser()
      : null;

    if (!user) {
      actionsEl.innerHTML = `<button type="button" id="hobak-login-btn" class="hobak-btn-primary">로그인</button>`;
      const loginBtn = document.getElementById('hobak-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => openAuthModal({ mode: 'login' }));
      }
    } else {
      actionsEl.innerHTML = `
        <span class="hobak-user-badge" id="hobak-user-nickname">${escapeText(user.nickname)}</span>
        <button type="button" id="hobak-logout-btn" class="hobak-btn-outline">로그아웃</button>
      `;
      const logoutBtn = document.getElementById('hobak-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          if (global.HobakStore && global.HobakStore.signOut) {
            await global.HobakStore.signOut();
          }
        });
      }
    }
  }

  function ensureAuthModal() {
    if (document.getElementById('hobak-auth-backdrop')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'hobak-auth-backdrop';
    wrapper.className = 'hobak-auth-backdrop';
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <div class="hobak-auth-modal" role="dialog" aria-modal="true" aria-labelledby="hobak-auth-title">
        <div class="hobak-auth-header">
          <h2 id="hobak-auth-title" class="hobak-auth-title">상큼이마켓 로그인</h2>
          <button type="button" id="hobak-auth-close" class="hobak-auth-close" aria-label="닫기">✕</button>
        </div>

        <div class="hobak-auth-tabs" role="tablist">
          <button type="button" class="hobak-auth-tab is-active" data-auth-tab="login" role="tab" aria-selected="true">로그인</button>
          <button type="button" class="hobak-auth-tab" data-auth-tab="signup" role="tab" aria-selected="false">회원가입</button>
        </div>

        <form id="hobak-auth-form" class="hobak-auth-form">
          <div class="hobak-auth-field" id="hobak-auth-nickname-field" hidden>
            <label for="hobak-auth-nickname">닉네임</label>
            <input type="text" id="hobak-auth-nickname" maxlength="20" placeholder="사용할 닉네임을 입력하세요" />
          </div>

          <div class="hobak-auth-field">
            <label for="hobak-auth-email">이메일</label>
            <input type="email" id="hobak-auth-email" required autocomplete="email" placeholder="example@email.com" />
          </div>

          <div class="hobak-auth-field">
            <label for="hobak-auth-password">비밀번호</label>
            <input type="password" id="hobak-auth-password" required minlength="6" autocomplete="current-password" placeholder="6자 이상 입력하세요" />
          </div>

          <p id="hobak-auth-message" class="hobak-auth-message" role="alert"></p>

          <button type="submit" id="hobak-auth-submit" class="hobak-btn-primary hobak-auth-submit">로그인</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrapper);

    const closeBtn = document.getElementById('hobak-auth-close');
    const form = document.getElementById('hobak-auth-form');
    const tabs = wrapper.querySelectorAll('[data-auth-tab]');

    closeBtn.addEventListener('click', closeAuthModal);
    wrapper.addEventListener('click', (e) => {
      if (e.target === wrapper) closeAuthModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !wrapper.hidden) closeAuthModal();
    });

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setAuthMode(tab.dataset.authTab));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('hobak-auth-email');
      const passwordInput = document.getElementById('hobak-auth-password');
      const nicknameInput = document.getElementById('hobak-auth-nickname');
      const msgEl = document.getElementById('hobak-auth-message');
      const submitBtn = document.getElementById('hobak-auth-submit');

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const nickname = nicknameInput.value.trim();

      msgEl.classList.remove('is-success');
      msgEl.textContent = '';

      if (authModalState.mode === 'signup' && !nickname) {
        msgEl.textContent = '닉네임을 입력해주세요.';
        nicknameInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = authModalState.mode === 'signup' ? '가입 중...' : '로그인 중...';

      try {
        if (authModalState.mode === 'signup') {
          const { user, session, error } = await global.HobakStore.signUp(email, password, nickname);
          if (error) {
            msgEl.textContent = error.message || '회원가입에 실패했어요.';
          } else if (user && session) {
            const cb = authModalState.onSuccess;
            closeAuthModal();
            if (typeof cb === 'function') cb(user);
          } else {
            msgEl.classList.add('is-success');
            msgEl.textContent = '가입 확인 메일을 발송했어요. 이메일 인증 후 로그인해주세요!';
          }
        } else {
          const { user, error } = await global.HobakStore.signIn(email, password);
          if (error) {
            msgEl.textContent = '이메일 또는 비밀번호를 확인해주세요.';
          } else if (user) {
            const cb = authModalState.onSuccess;
            closeAuthModal();
            if (typeof cb === 'function') cb(user);
          }
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = authModalState.mode === 'signup' ? '회원가입' : '로그인';
      }
    });
  }

  function setAuthMode(mode) {
    authModalState.mode = mode === 'signup' ? 'signup' : 'login';
    const isSignup = authModalState.mode === 'signup';
    const titleEl = document.getElementById('hobak-auth-title');
    const nickField = document.getElementById('hobak-auth-nickname-field');
    const nickInput = document.getElementById('hobak-auth-nickname');
    const submitBtn = document.getElementById('hobak-auth-submit');
    const msgEl = document.getElementById('hobak-auth-message');

    if (titleEl) titleEl.textContent = isSignup ? '상큼이마켓 회원가입' : '상큼이마켓 로그인';
    if (nickField) nickField.hidden = !isSignup;
    if (nickInput) nickInput.required = isSignup;
    if (submitBtn) submitBtn.textContent = isSignup ? '회원가입' : '로그인';
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.classList.remove('is-success');
    }

    document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
      const active = tab.dataset.authTab === authModalState.mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  function openAuthModal(options = {}) {
    ensureAuthModal();
    authModalState.onSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : null;
    setAuthMode(options.mode || 'login');
    const backdrop = document.getElementById('hobak-auth-backdrop');
    if (backdrop) {
      backdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      const emailInput = document.getElementById('hobak-auth-email');
      if (emailInput) setTimeout(() => emailInput.focus(), 50);
    }
  }

  function closeAuthModal() {
    const backdrop = document.getElementById('hobak-auth-backdrop');
    if (backdrop) {
      backdrop.hidden = true;
      document.body.style.overflow = '';
    }
    authModalState.onSuccess = null;
  }

  function bindWriteLinkGuard() {
    if (bindWriteLinkGuard._bound) return;
    bindWriteLinkGuard._bound = true;
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href$="write.html"]');
      if (!link) return;
      const user = global.HobakStore && global.HobakStore.getCurrentUser
        ? global.HobakStore.getCurrentUser()
        : null;
      if (!user) {
        e.preventDefault();
        const targetHref = link.getAttribute('href');
        openAuthModal({
          mode: 'login',
          onSuccess: () => {
            global.location.href = targetHref;
          }
        });
      }
    });
  }

  global.HobakLayout = {
    getPumpkinLogoSvg,
    renderHeader,
    renderFooter,
    openAuthModal,
    closeAuthModal
  };
})(window);
