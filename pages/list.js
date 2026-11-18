/* 호박 (Hobak) - Product List Page Logic */
(function () {
  const ITEMS_PER_PAGE = 9;

  const state = {
    location: '전체 동네',
    category: '전체',
    availableOnly: false,
    sort: 'latest',
    query: '',
    page: 1
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function syncUrlQuery(q) {
    try {
      const url = new URL(window.location.href);
      if (q) {
        url.searchParams.set('q', q);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      // Ignore history errors in restricted contexts
    }
  }

  function syncHeaderSearchInput(value) {
    const input = document.getElementById('hobak-global-search-input');
    if (input && input.value !== value) {
      input.value = value;
    }
  }

  function getFilteredAndSortedItems() {
    const allItems = window.HobakStore.getItems();
    const q = state.query.trim().toLowerCase();

    const filtered = allItems.filter((item) => {
      if (state.location !== '전체 동네' && item.shortLocation !== state.location) {
        return false;
      }
      if (state.category !== '전체' && item.category !== state.category) {
        return false;
      }
      if (state.availableOnly && item.status !== '거래완료') {
        return false;
      }
      if (q) {
        const haystack = [
          item.title,
          item.description,
          item.category,
          item.location,
          item.shortLocation
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (state.sort) {
        case 'popular':
          return (b.likes || 0) + (b.chats || 0) - ((a.likes || 0) + (a.chats || 0));
        case 'price-asc':
          return (a.isFree ? 0 : Number(a.price) || 0) - (b.isFree ? 0 : Number(b.price) || 0);
        case 'price-desc':
          return (b.isFree ? 0 : Number(b.price) || 0) - (a.isFree ? 0 : Number(a.price) || 0);
        case 'latest':
        default:
          return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return filtered;
  }

  function renderCategoryPills() {
    const container = document.getElementById('category-pills');
    if (!container) return;

    container.innerHTML = window.HobakStore.CATEGORIES.map((cat) => {
      const active = state.category === cat;
      return `<button
        type="button"
        class="category-pill${active ? ' is-active' : ''}"
        role="tab"
        aria-selected="${active}"
        data-category="${escapeHtml(cat)}"
      >${escapeHtml(cat)}</button>`;
    }).join('');
  }

  function renderPopularKeywords() {
    const container = document.getElementById('popular-keywords');
    if (!container) return;

    const currentQ = state.query.trim().toLowerCase();
    container.innerHTML = window.HobakStore.POPULAR_KEYWORDS.map((kw) => {
      const active = currentQ && currentQ === kw.toLowerCase();
      return `<button
        type="button"
        class="keyword-pill${active ? ' is-active' : ''}"
        data-keyword="${escapeHtml(kw)}"
      >${escapeHtml(kw)}</button>`;
    }).join('');
  }

  function renderProductCard(item) {
    const thumb = (item.images && item.images[0]) || '';
    const priceText = window.HobakStore.formatPrice(item.price, item.isFree);
    const statusText = item.status || '판매중';
    const isSold = statusText === '거래완료';
    const isReserved = statusText === '예약중';

    let badgeClass = 'status-selling';
    if (isReserved) {
      badgeClass = 'status-reserved';
    } else if (isSold) {
      badgeClass = 'status-sold';
    }
    const badgeHtml = `<span class="product-status-badge ${badgeClass}">${escapeHtml(statusText)}</span>`;

    const heartIcon = item.liked ? '♥' : '♡';

    return `
      <a href="detail.html?id=${encodeURIComponent(item.id)}" class="product-card${isSold ? ' is-sold' : ''}">
        <div class="product-thumb-wrap">
          <img
            src="${escapeHtml(thumb)}"
            alt="${escapeHtml(item.title)}"
            class="product-thumb"
            loading="lazy"
          />
          ${badgeHtml}
        </div>
        <div class="product-info">
          <h3 class="product-title">${escapeHtml(item.title)}</h3>
          <div class="product-price${item.isFree || Number(item.price) === 0 ? ' is-free' : ''}">${escapeHtml(priceText)}</div>
          <div class="product-meta">${escapeHtml(item.shortLocation)} · ${escapeHtml(item.timeAgo)} · ${escapeHtml((item.seller && item.seller.name) || '호박이웃')}</div>
          <div class="product-stats">
            <span class="product-stat-item${item.liked ? ' is-liked' : ''}" aria-label="관심 ${item.likes || 0}">
              <span>${heartIcon}</span>
              <span>${item.likes || 0}</span>
            </span>
            <span class="product-stat-item" aria-label="채팅 ${item.chats || 0}">
              <span>💬</span>
              <span>${item.chats || 0}</span>
            </span>
          </div>
        </div>
      </a>
    `;
  }

  function renderPagination(totalItems) {
    const container = document.getElementById('list-pagination');
    if (!container) return;

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const buttons = [];
    buttons.push(
      `<button type="button" class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} aria-label="이전 페이지">이전</button>`
    );

    for (let p = 1; p <= totalPages; p += 1) {
      buttons.push(
        `<button type="button" class="page-btn${p === state.page ? ' is-active' : ''}" data-page="${p}" aria-current="${p === state.page ? 'page' : 'false'}">${p}</button>`
      );
    }

    buttons.push(
      `<button type="button" class="page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''} aria-label="다음 페이지">다음</button>`
    );

    container.innerHTML = buttons.join('');
  }

  function render() {
    const items = getFilteredAndSortedItems();
    const totalCount = items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    if (state.page > totalPages) {
      state.page = totalPages;
    }

    const startIdx = (state.page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const titleEl = document.getElementById('list-section-title');
    if (titleEl) {
      const locLabel = state.location === '전체 동네' ? '울산 동구' : state.location;
      titleEl.textContent = `${locLabel} 중고거래 매물`;
    }

    const countEl = document.getElementById('list-count-badge');
    if (countEl) {
      countEl.textContent = `총 ${totalCount}개`;
    }

    const queryBar = document.getElementById('active-query-bar');
    const queryText = document.getElementById('active-query-text');
    if (queryBar && queryText) {
      const trimmed = state.query.trim();
      if (trimmed) {
        queryBar.hidden = false;
        queryText.textContent = trimmed;
      } else {
        queryBar.hidden = true;
      }
    }

    const gridEl = document.getElementById('product-grid');
    const emptyEl = document.getElementById('list-empty');
    if (gridEl && emptyEl) {
      if (totalCount === 0) {
        gridEl.innerHTML = '';
        gridEl.hidden = true;
        emptyEl.hidden = false;
      } else {
        gridEl.hidden = false;
        emptyEl.hidden = true;
        gridEl.innerHTML = pageItems.map(renderProductCard).join('');
      }
    }

    renderCategoryPills();
    renderPopularKeywords();
    renderPagination(totalCount);
  }

  function resetFilters() {
    state.location = '전체 동네';
    state.category = '전체';
    state.availableOnly = false;
    state.sort = 'latest';
    state.query = '';
    state.page = 1;

    const locationSelect = document.getElementById('location-select');
    if (locationSelect) locationSelect.value = state.location;

    const availableCheckbox = document.getElementById('available-only-checkbox');
    if (availableCheckbox) availableCheckbox.checked = false;

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = state.sort;

    syncHeaderSearchInput('');
    syncUrlQuery('');
    render();
  }

  function handleSearch(query) {
    state.query = query;
    state.page = 1;
    syncHeaderSearchInput(query);
    syncUrlQuery(query);
    if (query && window.HobakStore.recordSearchKeyword) {
      window.HobakStore.recordSearchKeyword(query);
    }
    render();
  }

  function bindEvents() {
    const locationSelect = document.getElementById('location-select');
    if (locationSelect) {
      locationSelect.addEventListener('change', (e) => {
        state.location = e.target.value;
        state.page = 1;
        render();
      });
    }

    const availableCheckbox = document.getElementById('available-only-checkbox');
    if (availableCheckbox) {
      availableCheckbox.addEventListener('change', (e) => {
        state.availableOnly = e.target.checked;
        state.page = 1;
        render();
      });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        render();
      });
    }

    const categoryPills = document.getElementById('category-pills');
    if (categoryPills) {
      categoryPills.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-category]');
        if (!btn) return;
        state.category = btn.dataset.category;
        state.page = 1;
        render();
      });
    }

    const popularKeywords = document.getElementById('popular-keywords');
    if (popularKeywords) {
      popularKeywords.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-keyword]');
        if (!btn) return;
        const kw = btn.dataset.keyword;
        const nextQuery = state.query.trim().toLowerCase() === kw.toLowerCase() ? '' : kw;
        handleSearch(nextQuery);
      });
    }

    const clearQueryBtn = document.getElementById('clear-query-btn');
    if (clearQueryBtn) {
      clearQueryBtn.addEventListener('click', () => handleSearch(''));
    }

    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetFilters);
    }

    const pagination = document.getElementById('list-pagination');
    if (pagination) {
      pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        const nextPage = Number(btn.dataset.page);
        if (!Number.isFinite(nextPage) || nextPage === state.page) return;
        state.page = nextPage;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const initialQuery = (params.get('q') || '').trim();
    state.query = initialQuery;

    window.HobakLayout.renderHeader('header-root', {
      homeHref: 'index.html',
      writeHref: 'write.html',
      searchValue: initialQuery,
      onSearch: handleSearch
    });
    window.HobakLayout.renderFooter('footer-root');

    bindEvents();
    await Promise.all([
      window.HobakStore.fetchItems(),
      window.HobakStore.fetchPopularKeywords()
    ]);
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
