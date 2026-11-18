/* 호박 (Hobak) - Product Detail Page */
(function () {
  const STATUS_OPTIONS = ['판매중', '예약중', '거래완료'];

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMannerEmoji(temp) {
    if (temp >= 42) return '🥰';
    if (temp >= 38) return '😄';
    return '😊';
  }

  function getStatusBadgeClass(status) {
    if (status === '예약중') return 'status-reserved';
    if (status === '거래완료') return 'status-completed';
    return '';
  }

  function getItemIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('id');
    return raw && raw.trim() !== '' ? raw.trim() : '1';
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('detail-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  function copyCurrentUrl() {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => showToast('상품 링크가 복사되었어요!'),
        () => fallbackCopy(url)
      );
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('상품 링크가 복사되었어요!');
    } catch (e) {
      showToast('링크 복사에 실패했어요.');
    }
    document.body.removeChild(ta);
  }

  function renderNotFound(mainEl) {
    document.title = '상품을 찾을 수 없어요 | 상큼이';
    mainEl.innerHTML = `
      <section class="detail-not-found">
        <div class="detail-not-found-emoji" aria-hidden="true">🎃</div>
        <h1>요청하신 매물을 찾을 수 없어요</h1>
        <p>삭제되었거나 존재하지 않는 게시글입니다.</p>
        <a href="index.html" class="hobak-btn-primary">← 홈 목록으로 돌아가기</a>
      </section>
    `;
  }

  function getRelatedItems(currentItem) {
    const all = window.HobakStore.getItems().filter(
      (it) => String(it.id) !== String(currentItem.id)
    );
    const sameNeighborhood = all.filter(
      (it) => it.shortLocation === currentItem.shortLocation
    );
    const others = all.filter(
      (it) => it.shortLocation !== currentItem.shortLocation
    );
    return sameNeighborhood.concat(others).slice(0, 4);
  }

  function renderRelatedSection(currentItem) {
    const related = getRelatedItems(currentItem);
    if (!related.length) return '';

    const cardsHtml = related
      .map((item) => {
        const thumb = (item.images && item.images[0]) || '';
        const badgeClass = getStatusBadgeClass(item.status);
        const priceText = window.HobakStore.formatPrice(item.price, item.isFree);
        return `
          <a href="detail.html?id=${encodeURIComponent(item.id)}" class="related-card">
            <div class="related-thumb-wrap">
              <img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title)}" class="related-thumb" loading="lazy" />
              ${
                badgeClass
                  ? `<span class="related-status-badge ${badgeClass}">${escapeHtml(item.status)}</span>`
                  : ''
              }
            </div>
            <div class="related-body">
              <h3 class="related-title">${escapeHtml(item.title)}</h3>
              <div class="related-price">${escapeHtml(priceText)}</div>
              <div class="related-meta">${escapeHtml(item.shortLocation)} · 관심 ${item.likes} · 채팅 ${item.chats}</div>
            </div>
          </a>
        `;
      })
      .join('');

    return `
      <section class="detail-related-section" aria-label="이 동네의 다른 매물">
        <div class="detail-related-header">
          <h2 class="detail-related-title">이 동네의 다른 매물</h2>
          <a href="index.html" class="detail-related-more">더 보기 ›</a>
        </div>
        <div class="detail-related-grid">
          ${cardsHtml}
        </div>
      </section>
    `;
  }

  function formatNowTime() {
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${period} ${hour12}:${m}`;
  }

  function buildSellerReply(item, userText) {
    if (userText.includes('네고') || userText.includes('가격') || userText.includes('제안')) {
      return item.negotiable
        ? '안녕하세요! 편하게 희망하시는 가격 말씀해 주세요 :)'
        : '안녕하세요! 죄송하지만 해당 상품은 가격 제안이 어렵습니다 🙏';
    }
    if (userText.includes('장소') || userText.includes('직거래') || userText.includes('어디')) {
      return `${item.location} 근처에서 직거래 가능합니다! 편하신 시간 알려주세요.`;
    }
    if (item.status === '거래완료') {
      return '앗, 이 상품은 방금 거래가 완료되었어요. 관심 가져주셔서 감사합니다!';
    }
    return `안녕하세요! "${item.title}" 아직 구매 가능합니다. 궁금하신 점 있으시면 편하게 물어보세요 😊`;
  }

  function setupChatModal(item) {
    const backdrop = document.getElementById('chat-modal-backdrop');
    const closeBtn = document.getElementById('chat-modal-close');
    const avatarEl = document.getElementById('chat-seller-avatar');
    const nameEl = document.getElementById('chat-modal-title');
    const tempEl = document.getElementById('chat-seller-temp');
    const locEl = document.getElementById('chat-seller-location');
    const productBar = document.getElementById('chat-product-bar');
    const messagesEl = document.getElementById('chat-messages');
    const quickRepliesEl = document.getElementById('chat-quick-replies');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');

    let initialized = false;
    let replyTimer = null;
    let roomId = null;

    function formatTimeFromIso(iso) {
      if (!iso) return formatNowTime();
      const d = new Date(iso);
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const period = h < 12 ? '오전' : '오후';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${period} ${hour12}:${m}`;
    }

    function appendMessage(sender, text, isoTime) {
      const row = document.createElement('div');
      row.className = `chat-bubble-row ${sender === 'me' ? 'is-me' : 'is-seller'}`;
      row.innerHTML = `
        <div class="chat-bubble">${escapeHtml(text)}</div>
        <span class="chat-time">${escapeHtml(formatTimeFromIso(isoTime))}</span>
      `;
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function sendUserMessage(text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      appendMessage('me', trimmed);
      input.value = '';

      if (!roomId && window.HobakStore.getOrCreateChatRoom) {
        const room = await window.HobakStore.getOrCreateChatRoom(item.id);
        if (room) roomId = room.id;
      }
      if (roomId && window.HobakStore.sendChatMessage) {
        window.HobakStore.sendChatMessage(roomId, 'buyer', trimmed);
      }

      clearTimeout(replyTimer);
      replyTimer = setTimeout(() => {
        const replyText = buildSellerReply(item, trimmed);
        appendMessage('seller', replyText);
        if (roomId && window.HobakStore.sendChatMessage) {
          window.HobakStore.sendChatMessage(roomId, 'seller', replyText);
        }
      }, 600);
    }

    async function openChat() {
      if (!initialized) {
        avatarEl.textContent = item.seller.avatarEmoji || '🎃';
        nameEl.textContent = item.seller.name;
        tempEl.textContent = `${item.seller.mannerTemp}°C`;
        locEl.textContent = item.seller.location;

        const thumb = (item.images && item.images[0]) || '';
        const priceText = window.HobakStore.formatPrice(item.price, item.isFree);
        productBar.innerHTML = `
          <img src="${escapeHtml(thumb)}" alt="" class="chat-product-thumb" />
          <div class="chat-product-info">
            <div class="chat-product-title">${escapeHtml(item.title)}</div>
            <div class="chat-product-price">${escapeHtml(priceText)}</div>
          </div>
        `;

        messagesEl.innerHTML = `
          <div class="chat-system-notice">${escapeHtml(item.seller.name)}님과의 상큼한 상큼이채팅이 시작되었어요.</div>
        `;
        initialized = true;

        if (window.HobakStore.getOrCreateChatRoom) {
          const room = await window.HobakStore.getOrCreateChatRoom(item.id);
          if (room) {
            roomId = room.id;
            const history = await window.HobakStore.fetchChatMessages(roomId);
            history.forEach((msg) => {
              appendMessage(msg.sender_role === 'buyer' ? 'me' : 'seller', msg.content, msg.created_at);
            });
          }
        }
      }

      backdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(() => input.focus(), 50);
    }

    function closeChat() {
      backdrop.hidden = true;
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeChat);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeChat();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !backdrop.hidden) closeChat();
    });

    quickRepliesEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chat-quick-chip');
      if (!chip) return;
      sendUserMessage(chip.dataset.msg || chip.textContent);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendUserMessage(input.value);
    });

    return { openChat };
  }

  function renderDetailPage(mainEl, item) {
    document.title = `${item.title} | 상큼이`;

    const images = item.images && item.images.length ? item.images : [''];
    let currentImageIdx = 0;

    const priceText = window.HobakStore.formatPrice(item.price, item.isFree);
    const temp = Number(item.seller.mannerTemp) || 36.5;
    const tempPercent = Math.min(100, Math.max(0, temp));
    const badgeClass = getStatusBadgeClass(item.status);
    const isCompleted = item.status === '거래완료';

    const statusButtonsHtml = STATUS_OPTIONS.map(
      (st) => `
        <button
          type="button"
          class="detail-status-btn ${item.status === st ? 'is-active' : ''}"
          data-status="${st}"
          aria-pressed="${item.status === st ? 'true' : 'false'}"
        >${st}</button>
      `
    ).join('');

    const dotsHtml =
      images.length > 1
        ? `<div class="detail-carousel-dots" id="detail-carousel-dots">
            ${images
              .map(
                (_, idx) => `
              <button
                type="button"
                class="detail-carousel-dot ${idx === 0 ? 'is-active' : ''}"
                data-idx="${idx}"
                aria-label="${idx + 1}번째 이미지"
              ></button>
            `
              )
              .join('')}
          </div>`
        : '';

    mainEl.innerHTML = `
      <article class="detail-card">
        <div class="detail-media-wrap">
          <div class="detail-image-box ${isCompleted ? 'is-completed' : ''}" id="detail-image-box">
            <div class="detail-top-overlay">
              <a href="index.html" class="detail-back-btn" aria-label="목록으로 돌아가기">
                <span aria-hidden="true">←</span>
                <span>목록으로</span>
              </a>
              <button type="button" id="detail-share-btn" class="detail-share-pill">
                <span aria-hidden="true">🔗</span>
                <span>공유하기</span>
              </button>
            </div>

            <img
              id="detail-main-image"
              src="${escapeHtml(images[0])}"
              alt="${escapeHtml(item.title)}"
              class="detail-image"
            />

            ${
              badgeClass
                ? `<span id="detail-status-badge" class="detail-status-overlay-badge ${badgeClass}">${escapeHtml(item.status)}</span>`
                : `<span id="detail-status-badge" class="detail-status-overlay-badge" hidden></span>`
            }

            ${
              images.length > 1
                ? `
              <button type="button" id="detail-prev-img" class="detail-carousel-btn detail-carousel-prev" aria-label="이전 이미지">‹</button>
              <button type="button" id="detail-next-img" class="detail-carousel-btn detail-carousel-next" aria-label="다음 이미지">›</button>
              ${dotsHtml}
            `
                : ''
            }
          </div>
        </div>

        <section class="detail-seller-row" aria-label="판매자 정보">
          <div class="detail-seller-left">
            <div class="detail-seller-avatar" aria-hidden="true">${escapeHtml(item.seller.avatarEmoji || '🎃')}</div>
            <div class="detail-seller-meta">
              <div class="detail-seller-name">${escapeHtml(item.seller.name)}</div>
              <div class="detail-seller-location">${escapeHtml(item.seller.location)}</div>
            </div>
          </div>
          <div class="detail-manner-box" title="상큼이마켓 매너온도는 기본 36.5°C에서 시작해요">
            <div class="detail-manner-top">
              <span>${temp.toFixed(1)}°C</span>
              <span aria-hidden="true">${getMannerEmoji(temp)}</span>
            </div>
            <div class="detail-manner-bar-track" aria-hidden="true">
              <div class="detail-manner-bar-fill" style="width: ${tempPercent}%;"></div>
            </div>
            <span class="detail-manner-label">매너온도</span>
          </div>
        </section>

        <div class="detail-divider"></div>

        <section class="detail-info-section">
          <h1 class="detail-title">${escapeHtml(item.title)}</h1>
          <div class="detail-category-time">
            <a href="index.html?q=${encodeURIComponent(item.category)}" class="detail-category-link">${escapeHtml(item.category)}</a>
            <span> · ${escapeHtml(item.timeAgo)}</span>
          </div>

          <div class="detail-price-row">
            <span class="detail-price">${escapeHtml(priceText)}</span>
            ${
              item.negotiable
                ? '<span class="detail-negotiable-badge">가격 제안 가능</span>'
                : ''
            }
          </div>

          <div id="detail-owner-controls" class="detail-owner-controls"></div>

          <p class="detail-description">${escapeHtml(item.description)}</p>

          <div class="detail-stats-row" id="detail-stats-row">
            관심 ${item.likes} · 채팅 ${item.chats} · 조회 ${item.views}
          </div>
        </section>

        <div class="detail-action-bar">
          <div class="detail-action-left">
            <button
              type="button"
              id="detail-like-btn"
              class="detail-like-btn ${item.liked ? 'is-liked' : ''}"
              aria-label="관심상품 찜하기"
              aria-pressed="${item.liked ? 'true' : 'false'}"
            >
              ${item.liked ? '❤️' : '♡'}
            </button>
            <div class="detail-action-divider" aria-hidden="true"></div>
            <div class="detail-action-price-wrap">
              <div class="detail-action-price">${escapeHtml(priceText)}</div>
              <div class="detail-action-nego">${item.negotiable ? '가격 제안 가능' : '가격 제안 불가'}</div>
            </div>
          </div>

          <button type="button" id="detail-chat-btn" class="detail-chat-btn">채팅하기</button>
        </div>
      </article>

      ${renderRelatedSection(item)}
    `;

    // Share button
    const shareBtn = document.getElementById('detail-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', copyCurrentUrl);
    }

    // Carousel controls
    if (images.length > 1) {
      const mainImg = document.getElementById('detail-main-image');
      const prevBtn = document.getElementById('detail-prev-img');
      const nextBtn = document.getElementById('detail-next-img');
      const dotsContainer = document.getElementById('detail-carousel-dots');

      function updateCarousel(nextIdx) {
        currentImageIdx = (nextIdx + images.length) % images.length;
        mainImg.src = images[currentImageIdx];
        if (dotsContainer) {
          dotsContainer.querySelectorAll('.detail-carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('is-active', i === currentImageIdx);
          });
        }
      }

      prevBtn.addEventListener('click', () => updateCarousel(currentImageIdx - 1));
      nextBtn.addEventListener('click', () => updateCarousel(currentImageIdx + 1));
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.detail-carousel-dot');
        if (!dot) return;
        updateCarousel(Number(dot.dataset.idx));
      });
    }

    // Owner controls (Edit / Delete / Status switcher)
    const ownerControlsEl = document.getElementById('detail-owner-controls');
    const statusBadge = document.getElementById('detail-status-badge');
    const imageBox = document.getElementById('detail-image-box');

    function renderOwnerControls() {
      if (!ownerControlsEl) return;
      const user = window.HobakStore.getCurrentUser ? window.HobakStore.getCurrentUser() : null;
      const isOwner = Boolean(user && item.sellerId && String(user.id) === String(item.sellerId));

      if (!isOwner) {
        ownerControlsEl.innerHTML = '';
        ownerControlsEl.hidden = true;
        return;
      }

      ownerControlsEl.hidden = false;
      const buttonsHtml = STATUS_OPTIONS.map(
        (st) => `
          <button
            type="button"
            class="detail-status-btn ${item.status === st ? 'is-active' : ''}"
            data-status="${st}"
            aria-pressed="${item.status === st ? 'true' : 'false'}"
          >${st}</button>
        `
      ).join('');

      ownerControlsEl.innerHTML = `
        <div class="detail-owner-actions">
          <button type="button" id="detail-edit-btn" class="detail-edit-btn">수정</button>
          <button type="button" id="detail-delete-btn" class="detail-delete-btn">삭제</button>
        </div>
        <div class="detail-status-switcher" id="detail-status-switcher" role="group" aria-label="거래 상태 변경">
          ${buttonsHtml}
        </div>
      `;

      const editBtn = document.getElementById('detail-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          window.location.href = `write.html?edit=${encodeURIComponent(item.id)}`;
        });
      }

      const deleteBtn = document.getElementById('detail-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (!confirm('정말 이 게시글을 삭제할까요?')) return;
          deleteBtn.disabled = true;
          try {
            await window.HobakStore.deleteItem(item.id);
            showToast('게시글이 삭제되었어요.');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 400);
          } catch (err) {
            console.error('Delete failed:', err);
            showToast('삭제에 실패했어요. 잠시 후 다시 시도해주세요.');
            deleteBtn.disabled = false;
          }
        });
      }

      const switcher = document.getElementById('detail-status-switcher');
      if (switcher) {
        switcher.addEventListener('click', async (e) => {
          const btn = e.target.closest('.detail-status-btn');
          if (!btn) return;
          const newStatus = btn.dataset.status;
          const updated = await window.HobakStore.updateStatus(item.id, newStatus);
          if (!updated) return;
          item.status = updated.status;

          switcher.querySelectorAll('.detail-status-btn').forEach((b) => {
            const active = b.dataset.status === newStatus;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
          });

          const nextBadgeClass = getStatusBadgeClass(newStatus);
          statusBadge.className = `detail-status-overlay-badge ${nextBadgeClass}`;
          if (nextBadgeClass) {
            statusBadge.textContent = newStatus;
            statusBadge.hidden = false;
          } else {
            statusBadge.hidden = true;
          }
          imageBox.classList.toggle('is-completed', newStatus === '거래완료');
          showToast(`거래 상태가 '${newStatus}'(으)로 변경되었어요.`);
        });
      }
    }

    renderOwnerControls();
    window.addEventListener('hobak:authchange', renderOwnerControls);

    // Like toggle
    const likeBtn = document.getElementById('detail-like-btn');
    const statsRow = document.getElementById('detail-stats-row');

    likeBtn.addEventListener('click', async () => {
      const updated = await window.HobakStore.toggleLike(item.id);
      if (!updated) return;
      item.liked = updated.liked;
      item.likes = updated.likes;

      likeBtn.classList.toggle('is-liked', item.liked);
      likeBtn.setAttribute('aria-pressed', item.liked ? 'true' : 'false');
      likeBtn.textContent = item.liked ? '❤️' : '♡';
      statsRow.textContent = `관심 ${item.likes} · 채팅 ${item.chats} · 조회 ${item.views}`;
      showToast(item.liked ? '관심 목록에 추가했어요!' : '관심 목록에서 제외했어요.');
    });

    // Chat modal
    const chatModal = setupChatModal(item);
    const chatBtn = document.getElementById('detail-chat-btn');
    chatBtn.addEventListener('click', chatModal.openChat);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.HobakLayout.renderHeader('header-root', {
      homeHref: 'index.html',
      writeHref: 'write.html'
    });
    window.HobakLayout.renderFooter('footer-root');

    const mainEl = document.getElementById('detail-main');
    const itemId = getItemIdFromUrl();
    await Promise.all([
      window.HobakStore.initAuth(),
      window.HobakStore.fetchItems()
    ]);
    const item = await window.HobakStore.fetchItemById(itemId);

    if (!item) {
      renderNotFound(mainEl);
      return;
    }

    renderDetailPage(mainEl, item);
  });
})();
