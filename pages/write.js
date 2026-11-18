/* 호박 (Hobak) - Write / Post Item Page Logic */
(function () {
  const MAX_IMAGES = 10;

  document.addEventListener('DOMContentLoaded', async () => {
    // Render shared header & footer
    if (window.HobakLayout) {
      window.HobakLayout.renderHeader('header-root', {
        homeHref: 'index.html',
        writeHref: 'write.html',
        showSearch: false
      });
      window.HobakLayout.renderFooter('footer-root');
    }

    const store = window.HobakStore;
    if (!store) return;

    const layoutEl = document.getElementById('write-layout');
    const sellerNameInput = document.getElementById('seller-name');

    function syncLoggedInSeller(user) {
      if (user && sellerNameInput) {
        sellerNameInput.value = user.nickname || '호박이웃';
        sellerNameInput.readOnly = true;
        const previewSellerName = document.getElementById('preview-seller-name');
        if (previewSellerName) previewSellerName.textContent = sellerNameInput.value;
      }
      if (layoutEl) layoutEl.hidden = false;
    }

    const activeUser = await store.initAuth();
    if (!activeUser) {
      if (layoutEl) layoutEl.hidden = true;
      if (window.HobakLayout && window.HobakLayout.openAuthModal) {
        window.HobakLayout.openAuthModal({
          mode: 'login',
          onSuccess: (user) => syncLoggedInSeller(user)
        });
      }
    } else {
      syncLoggedInSeller(activeUser);
    }

    // DOM Elements
    const previewToggleBtn = document.getElementById('preview-toggle-btn');
    const form = document.getElementById('write-form');

    // Image elements
    const dropzone = document.getElementById('image-dropzone');
    const fileInput = document.getElementById('image-file-input');
    const mainPreviewImg = document.getElementById('main-preview-img');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const imageChangeBadge = document.getElementById('image-change-badge');
    const imageCountText = document.getElementById('image-count-text');
    const clearImagesBtn = document.getElementById('clear-images-btn');
    const thumbStrip = document.getElementById('uploaded-thumb-strip');
    const sampleList = document.getElementById('sample-image-list');

    // Seller & Form fields
    const sellerLocationSelect = document.getElementById('seller-location');
    const titleInput = document.getElementById('item-title');
    const categoryPillsEl = document.getElementById('category-pills');
    const priceInput = document.getElementById('item-price');
    const freeCheckbox = document.getElementById('item-free');
    const negotiableCheckbox = document.getElementById('item-negotiable');
    const descriptionInput = document.getElementById('item-description');
    const descCharCount = document.getElementById('desc-char-count');

    // Error elements
    const errorTitle = document.getElementById('error-title');
    const errorCategory = document.getElementById('error-category');
    const errorPrice = document.getElementById('error-price');
    const errorDescription = document.getElementById('error-description');

    // Live Preview elements
    const previewCardImg = document.getElementById('preview-card-img');
    const previewImageCounter = document.getElementById('preview-image-counter');
    const previewPrevBtn = document.getElementById('preview-prev-btn');
    const previewNextBtn = document.getElementById('preview-next-btn');
    const previewSellerName = document.getElementById('preview-seller-name');
    const previewSellerLocation = document.getElementById('preview-seller-location');
    const previewTitle = document.getElementById('preview-title');
    const previewCategory = document.getElementById('preview-category');
    const previewPrice = document.getElementById('preview-price');
    const previewNegoTag = document.getElementById('preview-nego-tag');
    const previewDescription = document.getElementById('preview-description');

    // State
    const state = {
      images: [],
      activeImageIndex: 0,
      category: '',
      isPreviewMode: false
    };

    const defaultSampleUrl =
      store.SAMPLE_IMAGES && store.SAMPLE_IMAGES.length
        ? store.SAMPLE_IMAGES[0].url
        : '';

    // Initialize Category Pills
    const categories = store.CATEGORIES.filter((c) => c !== '전체');
    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-pill';
      btn.textContent = cat;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.addEventListener('click', () => {
        state.category = cat;
        categoryPillsEl.querySelectorAll('.category-pill').forEach((pill) => {
          const selected = pill.textContent === cat;
          pill.classList.toggle('is-selected', selected);
          pill.setAttribute('aria-checked', String(selected));
        });
        errorCategory.textContent = '';
        updatePreview();
      });
      categoryPillsEl.appendChild(btn);
    });

    // Initialize Sample Image Buttons
    if (Array.isArray(store.SAMPLE_IMAGES)) {
      store.SAMPLE_IMAGES.forEach((sample) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'write-sample-btn';

        const img = document.createElement('img');
        img.src = sample.url;
        img.alt = sample.label;

        const label = document.createElement('span');
        label.textContent = sample.label;

        btn.appendChild(img);
        btn.appendChild(label);

        btn.addEventListener('click', () => {
          addImages([sample.url]);
        });

        sampleList.appendChild(btn);
      });
    }

    // Image Helpers
    function addImages(urls) {
      if (!urls.length) return;
      const remaining = MAX_IMAGES - state.images.length;
      if (remaining <= 0) {
        alert(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
        return;
      }
      const toAdd = urls.slice(0, remaining);
      const firstNewIndex = state.images.length;
      state.images.push(...toAdd);
      state.activeImageIndex = firstNewIndex;
      renderImages();
      updatePreview();
    }

    function readFilesAsDataUrls(fileList) {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;

      const remaining = MAX_IMAGES - state.images.length;
      if (remaining <= 0) {
        alert(`이미지는 최대 ${MAX_IMAGES}장까지 등록할 수 있어요.`);
        return;
      }

      const targetFiles = files.slice(0, remaining);
      Promise.all(
        targetFiles.map(
          (file) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
            })
        )
      ).then((results) => {
        const valid = results.filter(Boolean);
        addImages(valid);
      });
    }

    function renderImages() {
      const count = state.images.length;
      imageCountText.textContent = `${count} / ${MAX_IMAGES}`;
      clearImagesBtn.hidden = count === 0;

      if (count === 0) {
        dropzone.classList.remove('has-image');
        mainPreviewImg.hidden = true;
        mainPreviewImg.removeAttribute('src');
        imagePlaceholder.hidden = false;
        imageChangeBadge.hidden = true;
        thumbStrip.hidden = true;
        thumbStrip.innerHTML = '';
        return;
      }

      if (state.activeImageIndex >= count) {
        state.activeImageIndex = count - 1;
      }

      dropzone.classList.add('has-image');
      mainPreviewImg.src = state.images[state.activeImageIndex];
      mainPreviewImg.hidden = false;
      imagePlaceholder.hidden = true;
      imageChangeBadge.hidden = false;

      thumbStrip.hidden = false;
      thumbStrip.innerHTML = '';

      state.images.forEach((src, idx) => {
        const item = document.createElement('div');
        item.className = 'write-thumb-item' + (idx === state.activeImageIndex ? ' is-active' : '');
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label', `${idx + 1}번째 이미지 보기`);

        const img = document.createElement('img');
        img.src = src;
        img.alt = `업로드 이미지 ${idx + 1}`;
        item.appendChild(img);

        if (idx === 0) {
          const badge = document.createElement('span');
          badge.className = 'write-thumb-badge';
          badge.textContent = '대표';
          item.appendChild(badge);
        }

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'write-thumb-remove';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', `${idx + 1}번째 이미지 삭제`);
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.images.splice(idx, 1);
          if (state.activeImageIndex >= state.images.length) {
            state.activeImageIndex = Math.max(0, state.images.length - 1);
          }
          renderImages();
          updatePreview();
        });
        item.appendChild(removeBtn);

        const selectThumb = () => {
          state.activeImageIndex = idx;
          renderImages();
          updatePreview();
        };
        item.addEventListener('click', selectThumb);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectThumb();
          }
        });

        thumbStrip.appendChild(item);
      });
    }

    // Image Upload Events
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        readFilesAsDataUrls(e.target.files);
      }
      fileInput.value = '';
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        readFilesAsDataUrls(e.dataTransfer.files);
      }
    });

    clearImagesBtn.addEventListener('click', () => {
      state.images = [];
      state.activeImageIndex = 0;
      renderImages();
      updatePreview();
    });

    // Preview Image Carousel Navigation
    previewPrevBtn.addEventListener('click', () => {
      if (state.images.length <= 1) return;
      state.activeImageIndex =
        (state.activeImageIndex - 1 + state.images.length) % state.images.length;
      renderImages();
      updatePreview();
    });

    previewNextBtn.addEventListener('click', () => {
      if (state.images.length <= 1) return;
      state.activeImageIndex = (state.activeImageIndex + 1) % state.images.length;
      renderImages();
      updatePreview();
    });

    // Live Detail Preview Updater
    function updatePreview() {
      // Image
      if (state.images.length > 0) {
        previewCardImg.src = state.images[state.activeImageIndex];
        previewImageCounter.hidden = false;
        previewImageCounter.textContent = `${state.activeImageIndex + 1} / ${state.images.length}`;
        const hasMultiple = state.images.length > 1;
        previewPrevBtn.hidden = !hasMultiple;
        previewNextBtn.hidden = !hasMultiple;
      } else {
        previewCardImg.src = defaultSampleUrl;
        previewImageCounter.hidden = true;
        previewPrevBtn.hidden = true;
        previewNextBtn.hidden = true;
      }

      // Seller
      const sellerName = sellerNameInput.value.trim() || '호박이웃';
      const location = sellerLocationSelect.value || '울산 동구 방어동';
      previewSellerName.textContent = sellerName;
      previewSellerLocation.textContent = location;

      // Title
      const titleVal = titleInput.value.trim();
      if (titleVal) {
        previewTitle.textContent = titleVal;
        previewTitle.classList.remove('placeholder');
      } else {
        previewTitle.textContent = '글 제목이 여기에 표시됩니다';
        previewTitle.classList.add('placeholder');
      }

      // Category
      previewCategory.textContent = state.category || '카테고리 미선택';

      // Price & Negotiable
      const isFree = freeCheckbox.checked;
      const rawPrice = priceInput.value.trim();
      if (isFree) {
        previewPrice.textContent = store.formatPrice(0, true);
        previewNegoTag.hidden = true;
      } else if (rawPrice !== '' && Number(rawPrice) >= 0) {
        previewPrice.textContent = store.formatPrice(Number(rawPrice), false);
        previewNegoTag.hidden = false;
        previewNegoTag.textContent = negotiableCheckbox.checked
          ? '가격 제안 가능'
          : '가격 제안 불가';
      } else {
        previewPrice.textContent = '가격 미입력';
        previewNegoTag.hidden = false;
        previewNegoTag.textContent = negotiableCheckbox.checked
          ? '가격 제안 가능'
          : '가격 제안 불가';
      }

      // Description
      const descVal = descriptionInput.value.trim();
      if (descVal) {
        previewDescription.textContent = descVal;
        previewDescription.classList.remove('placeholder');
      } else {
        previewDescription.textContent =
          '작성하신 자세한 설명이 상품 상세 페이지와 동일한 형태로 표시됩니다.';
        previewDescription.classList.add('placeholder');
      }
    }

    // Dynamic Location -> Description Placeholder
    function updateDescriptionPlaceholder() {
      const loc = sellerLocationSelect.value || '울산 동구 방어동';
      const shortDong = loc.split(' ').pop() || '방어동';
      descriptionInput.placeholder = `${shortDong}에 올릴 게시글 내용을 작성해주세요. (판매 금지 물품은 게시가 제한될 수 있어요.)`;
    }

    // Free Checkbox Behavior
    freeCheckbox.addEventListener('change', () => {
      if (freeCheckbox.checked) {
        priceInput.value = '0';
        priceInput.disabled = true;
        negotiableCheckbox.checked = false;
        negotiableCheckbox.disabled = true;
        errorPrice.textContent = '';
        priceInput.classList.remove('is-invalid');
      } else {
        priceInput.disabled = false;
        if (priceInput.value === '0') {
          priceInput.value = '';
        }
        negotiableCheckbox.disabled = false;
        negotiableCheckbox.checked = true;
      }
      updatePreview();
    });

    // Field Listeners for Live Preview & Error Clearing
    sellerNameInput.addEventListener('input', updatePreview);
    sellerLocationSelect.addEventListener('change', () => {
      updateDescriptionPlaceholder();
      updatePreview();
    });

    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim()) {
        errorTitle.textContent = '';
        titleInput.classList.remove('is-invalid');
      }
      updatePreview();
    });

    priceInput.addEventListener('input', () => {
      errorPrice.textContent = '';
      priceInput.classList.remove('is-invalid');
      updatePreview();
    });

    negotiableCheckbox.addEventListener('change', updatePreview);

    descriptionInput.addEventListener('input', () => {
      descCharCount.textContent = `${descriptionInput.value.length} / 2000`;
      if (descriptionInput.value.trim()) {
        errorDescription.textContent = '';
        descriptionInput.classList.remove('is-invalid');
      }
      updatePreview();
    });

    // Mobile Preview Toggle
    function setPreviewMode(enabled) {
      state.isPreviewMode = enabled;
      layoutEl.classList.toggle('is-preview-mode', enabled);
      previewToggleBtn.setAttribute('aria-pressed', String(enabled));
      previewToggleBtn.textContent = enabled ? '작성으로' : '미리보기';
    }

    previewToggleBtn.addEventListener('click', () => {
      setPreviewMode(!state.isPreviewMode);
    });

    // Form Validation & Submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear previous errors
      errorTitle.textContent = '';
      errorCategory.textContent = '';
      errorPrice.textContent = '';
      errorDescription.textContent = '';
      titleInput.classList.remove('is-invalid');
      priceInput.classList.remove('is-invalid');
      descriptionInput.classList.remove('is-invalid');

      const title = titleInput.value.trim();
      const category = state.category;
      const isFree = freeCheckbox.checked;
      const rawPrice = priceInput.value.trim();
      const numericPrice = Number(rawPrice);
      const description = descriptionInput.value.trim();

      let firstInvalidEl = null;

      if (!title) {
        errorTitle.textContent = '글 제목을 입력해주세요.';
        titleInput.classList.add('is-invalid');
        firstInvalidEl = firstInvalidEl || titleInput;
      }

      if (!category) {
        errorCategory.textContent = '카테고리를 선택해주세요.';
        if (!firstInvalidEl) {
          firstInvalidEl = categoryPillsEl.querySelector('.category-pill');
        }
      }

      if (!isFree) {
        if (rawPrice === '' || Number.isNaN(numericPrice)) {
          errorPrice.textContent = '가격을 입력하거나 나눔을 선택해주세요.';
          priceInput.classList.add('is-invalid');
          firstInvalidEl = firstInvalidEl || priceInput;
        } else if (numericPrice < 0) {
          errorPrice.textContent = '가격은 0원 이상으로 입력해주세요.';
          priceInput.classList.add('is-invalid');
          firstInvalidEl = firstInvalidEl || priceInput;
        }
      }

      if (!description) {
        errorDescription.textContent = '자세한 설명을 입력해주세요.';
        descriptionInput.classList.add('is-invalid');
        firstInvalidEl = firstInvalidEl || descriptionInput;
      }

      if (firstInvalidEl) {
        if (state.isPreviewMode) {
          setPreviewMode(false);
        }
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const submitButtons = form.querySelectorAll('button[type="submit"], #submit-top-btn');
      const topSubmitBtn = document.getElementById('submit-top-btn');
      submitButtons.forEach((b) => (b.disabled = true));
      if (topSubmitBtn) topSubmitBtn.disabled = true;

      try {
        const payload = {
          title,
          category,
          price: isFree ? 0 : numericPrice,
          isFree: isFree || numericPrice === 0,
          negotiable: isFree ? false : negotiableCheckbox.checked,
          location: sellerLocationSelect.value,
          description,
          images: state.images.slice(),
          sellerName: sellerNameInput.value.trim() || '상큼이이웃'
        };

        const editId = new URLSearchParams(window.location.search).get('edit');
        const saved = editId
          ? await store.updateItem(editId, payload)
          : await store.addItem(payload);

        window.location.href = `detail.html?id=${saved.id}`;
      } catch (err) {
        console.error('Failed to publish item:', err);
        alert('게시글 등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
        submitButtons.forEach((b) => (b.disabled = false));
        if (topSubmitBtn) topSubmitBtn.disabled = false;
      }
    });

    // Load existing item if in edit mode (?edit=id)
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId && activeUser) {
      const existing = await store.fetchItemById(editId);
      if (!existing || String(existing.sellerId) !== String(activeUser.id)) {
        alert('본인이 작성한 글만 수정할 수 있어요.');
        window.location.href = `detail.html?id=${encodeURIComponent(editId)}`;
        return;
      }

      const topbarTitle = document.querySelector('.write-topbar-title');
      if (topbarTitle) topbarTitle.textContent = '내 물건 수정하기';
      const topSubmit = document.getElementById('submit-top-btn');
      if (topSubmit) topSubmit.textContent = '수정 완료';
      const footerSubmit = form.querySelector('.write-submit-btn');
      if (footerSubmit) footerSubmit.textContent = '수정 완료';

      titleInput.value = existing.title || '';
      state.category = existing.category || '';
      categoryPillsEl.querySelectorAll('.category-pill').forEach((pill) => {
        const selected = pill.textContent === state.category;
        pill.classList.toggle('is-selected', selected);
        pill.setAttribute('aria-checked', String(selected));
      });
      freeCheckbox.checked = Boolean(existing.isFree);
      priceInput.disabled = freeCheckbox.checked;
      priceInput.value = existing.isFree ? '' : String(existing.price || 0);
      negotiableCheckbox.checked = Boolean(existing.negotiable);
      if (existing.location) sellerLocationSelect.value = existing.location;
      descriptionInput.value = existing.description || '';
      descCharCount.textContent = `${descriptionInput.value.length} / 2000`;
      state.images = Array.isArray(existing.images) ? existing.images.slice() : [];
      state.activeImageIndex = 0;
    }

    // Initial render
    renderImages();
    updateDescriptionPlaceholder();
    updatePreview();
  });
})();
