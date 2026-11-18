/* 호박 (Hobak) - Supabase Store & Shared Constants */
(function (global) {
  const SUPABASE_URL = 'https://bzmibnpckejfepcdathn.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6bWlibnBja2VqZmVwY2RhdGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjgzMTIsImV4cCI6MjExMDQwNDMxMn0.8XKgps29tVNio6YiNtOv_jjW3hBg6XzM16js4XTDS18';

  const VIEWER_TOKEN_KEY = 'hobak_viewer_token';

  const CATEGORIES = [
    '전체',
    '여성의류',
    '디지털기기',
    '가구/인테리어',
    '생활가전',
    '스포츠/레저',
    '도서/티켓',
    '뷰티/미용',
    '기타'
  ];

  const DEFAULT_KEYWORDS = [
    '트위드 자켓',
    '아이폰',
    '자전거',
    '에어팟',
    '캠핑의자',
    '가습기',
    '원피스',
    '책상',
    '니트',
    '선풍기'
  ];

  let itemsCache = [];
  let popularKeywords = DEFAULT_KEYWORDS.slice();
  let currentUser = null;
  let authInitialized = false;

  function getClient() {
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      return null;
    }
    if (!getClient._instance) {
      getClient._instance = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return getClient._instance;
  }

  function getViewerToken() {
    try {
      let token = localStorage.getItem(VIEWER_TOKEN_KEY);
      if (!token) {
        token =
          global.crypto && typeof global.crypto.randomUUID === 'function'
            ? global.crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
        localStorage.setItem(VIEWER_TOKEN_KEY, token);
      }
      return token;
    } catch (e) {
      return '00000000-0000-4000-8000-000000000001';
    }
  }

  function formatTimeAgo(isoOrMs) {
    const ts = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
    if (!Number.isFinite(ts)) return '방금 전';
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  }

  function mapRowToItem(row, likedSet) {
    const createdMs = new Date(row.created_at).getTime();
    return {
      id: row.id,
      sellerId: row.seller_id || null,
      title: row.title,
      category: row.category,
      price: row.price,
      isFree: Boolean(row.is_free || row.price === 0),
      negotiable: Boolean(row.negotiable),
      location: row.location,
      shortLocation: row.short_location,
      timeAgo: formatTimeAgo(createdMs),
      createdAt: createdMs,
      description: row.description,
      images: Array.isArray(row.images) && row.images.length ? row.images : ['assets/images/item-1.jpg'],
      seller: {
        name: row.seller_nickname || '호박이웃',
        avatarEmoji: row.seller_avatar_emoji || '🎃',
        location: row.location,
        mannerTemp: Number(row.seller_manner_temp) || 36.5
      },
      likes: Number(row.likes_count) || 0,
      chats: Number(row.chats_count) || 0,
      views: Number(row.views_count) || 0,
      liked: likedSet ? likedSet.has(String(row.id)) : false,
      status: row.status || '판매중'
    };
  }

  function formatPrice(price, isFree) {
    if (isFree || Number(price) === 0) return '나눔 🧡';
    return Number(price).toLocaleString('ko-KR') + '원';
  }

  async function fetchLikedItemIds(client) {
    const token = getViewerToken();
    const { data, error } = await client
      .from('item_likes')
      .select('item_id')
      .eq('viewer_token', token);
    if (error || !data) return new Set();
    return new Set(data.map((r) => String(r.item_id)));
  }

  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function uploadImageIfDataUrl(client, src, idx) {
    if (!src || !src.startsWith('data:image/')) return src;
    try {
      const blob = await dataUrlToBlob(src);
      const ext = (blob.type && blob.type.split('/')[1]) || 'png';
      const filePath = `uploads/${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await client.storage.from('item-images').upload(filePath, blob, {
        contentType: blob.type || 'image/png',
        upsert: false
      });
      if (error) {
        console.warn('Storage upload failed, keeping inline image:', error.message);
        return src;
      }
      const { data } = client.storage.from('item-images').getPublicUrl(filePath);
      return (data && data.publicUrl) || src;
    } catch (e) {
      console.warn('Image upload error:', e);
      return src;
    }
  }

  async function ensureProfile(client, user, fallbackNickname) {
    if (!user) return null;
    const metaNick =
      (user.user_metadata && user.user_metadata.nickname) || fallbackNickname || '호박이웃';
    const { data: existing } = await client
      .from('profiles')
      .select('id, nickname, avatar_emoji, neighborhood, manner_temp')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      return {
        id: user.id,
        email: user.email || '',
        nickname: existing.nickname || metaNick,
        avatarEmoji: existing.avatar_emoji || '🎃',
        neighborhood: existing.neighborhood || '울산 동구 방어동',
        mannerTemp: Number(existing.manner_temp) || 36.5
      };
    }

    const { data: inserted } = await client
      .from('profiles')
      .upsert(
        {
          id: user.id,
          nickname: String(metaNick).trim().slice(0, 20) || '호박이웃',
          avatar_emoji: '🎃',
          neighborhood: '울산 동구 방어동',
          manner_temp: 36.5
        },
        { onConflict: 'id' }
      )
      .select('id, nickname, avatar_emoji, neighborhood, manner_temp')
      .maybeSingle();

    return {
      id: user.id,
      email: user.email || '',
      nickname: (inserted && inserted.nickname) || metaNick,
      avatarEmoji: (inserted && inserted.avatar_emoji) || '🎃',
      neighborhood: (inserted && inserted.neighborhood) || '울산 동구 방어동',
      mannerTemp: (inserted && Number(inserted.manner_temp)) || 36.5
    };
  }

  function notifyAuthChange() {
    global.dispatchEvent(new CustomEvent('hobak:authchange', { detail: { user: currentUser } }));
  }

  const store = {
    CATEGORIES,
    get POPULAR_KEYWORDS() {
      return popularKeywords;
    },
    getCurrentUser() {
      return currentUser;
    },
    async initAuth() {
      const client = getClient();
      if (!client) return null;
      if (authInitialized) return currentUser;
      authInitialized = true;

      const { data } = await client.auth.getSession();
      const sessionUser = data && data.session ? data.session.user : null;
      currentUser = sessionUser ? await ensureProfile(client, sessionUser) : null;
      notifyAuthChange();

      client.auth.onAuthStateChange(async (_event, session) => {
        const u = session ? session.user : null;
        currentUser = u ? await ensureProfile(client, u) : null;
        notifyAuthChange();
      });

      return currentUser;
    },
    async signIn(email, password) {
      const client = getClient();
      if (!client) return { user: null, error: { message: 'Supabase 연결을 확인해주세요.' } };
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error };
      currentUser = data.user ? await ensureProfile(client, data.user) : null;
      notifyAuthChange();
      return { user: currentUser, error: null };
    },
    async signUp(email, password, nickname) {
      const client = getClient();
      if (!client) return { user: null, session: null, error: { message: 'Supabase 연결을 확인해주세요.' } };
      const cleanNick = String(nickname || '').trim().slice(0, 20);
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { nickname: cleanNick } }
      });
      if (error) return { user: null, session: null, error };

      if (data.user && data.session) {
        currentUser = await ensureProfile(client, data.user, cleanNick);
        notifyAuthChange();
      }
      return { user: currentUser, session: data.session, error: null };
    },
    async signOut() {
      const client = getClient();
      if (!client) return;
      await client.auth.signOut();
      currentUser = null;
      notifyAuthChange();
    },
    SAMPLE_IMAGES: [
      { label: '트위드 세트', url: 'assets/images/item-1.jpg' },
      { label: '디지털기기', url: 'assets/images/item-2.jpg' },
      { label: '가구/인테리어', url: 'assets/images/item-3.jpg' },
      { label: '생활가전', url: 'assets/images/item-4.jpg' },
      { label: '여성의류', url: 'assets/images/item-6.jpg' }
    ],
    formatPrice,
    formatTimeAgo,
    getItems() {
      return itemsCache.slice();
    },
    getItemById(id) {
      return itemsCache.find((item) => String(item.id) === String(id)) || null;
    },
    async fetchItems() {
      const client = getClient();
      if (!client) return itemsCache;
      const [{ data, error }, likedSet] = await Promise.all([
        client.from('items').select('*').order('created_at', { ascending: false }),
        fetchLikedItemIds(client)
      ]);
      if (error) {
        console.warn('fetchItems failed:', error.message);
        return itemsCache;
      }
      itemsCache = (data || []).map((row) => mapRowToItem(row, likedSet));
      return itemsCache.slice();
    },
    async fetchItemById(id) {
      const client = getClient();
      if (!client) return store.getItemById(id);
      const [{ data, error }, likedSet] = await Promise.all([
        client.from('items').select('*').eq('id', Number(id)).maybeSingle(),
        fetchLikedItemIds(client)
      ]);
      if (error || !data) return null;

      // Increment view count in background
      const nextViews = (Number(data.views_count) || 0) + 1;
      client.from('items').update({ views_count: nextViews }).eq('id', data.id).then(() => {});
      data.views_count = nextViews;

      const mapped = mapRowToItem(data, likedSet);
      const idx = itemsCache.findIndex((it) => String(it.id) === String(mapped.id));
      if (idx >= 0) itemsCache[idx] = mapped;
      else itemsCache.unshift(mapped);
      return mapped;
    },
    async fetchPopularKeywords() {
      const client = getClient();
      if (!client) return popularKeywords;
      const { data, error } = await client
        .from('popular_keywords')
        .select('keyword')
        .order('search_count', { ascending: false })
        .limit(10);
      if (!error && Array.isArray(data) && data.length > 0) {
        popularKeywords = data.map((r) => r.keyword);
      }
      return popularKeywords;
    },
    async recordSearchKeyword(keyword) {
      const clean = String(keyword || '').trim().slice(0, 40);
      if (!clean) return;
      const client = getClient();
      if (!client) return;
      const { data: existing } = await client
        .from('popular_keywords')
        .select('id, search_count')
        .eq('keyword', clean)
        .maybeSingle();
      if (existing) {
        await client
          .from('popular_keywords')
          .update({ search_count: existing.search_count + 1, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await client.from('popular_keywords').insert({ keyword: clean, search_count: 1 });
      }
    },
    async addItem(newItem) {
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');

      const rawImages =
        newItem.images && newItem.images.length ? newItem.images : ['assets/images/item-1.jpg'];
      const uploadedImages = await Promise.all(
        rawImages.map((src, idx) => uploadImageIfDataUrl(client, src, idx))
      );

      const loc = newItem.location || '울산 동구 방어동';
      const shortLoc = loc.split(' ').pop() || '방어동';
      const isFree = Boolean(newItem.isFree || Number(newItem.price) === 0);

      const payload = {
        seller_id: currentUser ? currentUser.id : null,
        seller_nickname: ((currentUser && currentUser.nickname) || newItem.sellerName || '호박이웃').slice(0, 20),
        seller_avatar_emoji: (currentUser && currentUser.avatarEmoji) || '🎃',
        seller_manner_temp: (currentUser && currentUser.mannerTemp) || 36.5,
        title: newItem.title,
        category: newItem.category || '기타',
        price: isFree ? 0 : Number(newItem.price) || 0,
        is_free: isFree,
        negotiable: Boolean(newItem.negotiable),
        location: loc,
        short_location: shortLoc,
        description: newItem.description,
        images: uploadedImages,
        status: '판매중'
      };

      const { data, error } = await client.from('items').insert(payload).select('*').single();
      if (error) throw error;

      const mapped = mapRowToItem(data, new Set());
      itemsCache.unshift(mapped);
      return mapped;
    },
    async updateItem(id, updatedFields) {
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');
      const itemId = Number(id);

      const rawImages =
        updatedFields.images && updatedFields.images.length
          ? updatedFields.images
          : ['assets/images/item-1.jpg'];
      const uploadedImages = await Promise.all(
        rawImages.map((src, idx) => uploadImageIfDataUrl(client, src, idx))
      );

      const loc = updatedFields.location || '울산 동구 방어동';
      const shortLoc = loc.split(' ').pop() || '방어동';
      const isFree = Boolean(updatedFields.isFree || Number(updatedFields.price) === 0);

      const payload = {
        title: updatedFields.title,
        category: updatedFields.category || '기타',
        price: isFree ? 0 : Number(updatedFields.price) || 0,
        is_free: isFree,
        negotiable: Boolean(updatedFields.negotiable),
        location: loc,
        short_location: shortLoc,
        description: updatedFields.description,
        images: uploadedImages
      };

      const { data, error } = await client
        .from('items')
        .update(payload)
        .eq('id', itemId)
        .select('*')
        .single();
      if (error) throw error;

      const likedSet = await fetchLikedItemIds(client);
      const mapped = mapRowToItem(data, likedSet);
      const idx = itemsCache.findIndex((it) => String(it.id) === String(itemId));
      if (idx >= 0) itemsCache[idx] = mapped;
      return mapped;
    },
    async deleteItem(id) {
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');
      const itemId = Number(id);
      const { error } = await client.from('items').delete().eq('id', itemId);
      if (error) throw error;
      itemsCache = itemsCache.filter((it) => String(it.id) !== String(itemId));
      return true;
    },
    async toggleLike(id) {
      const client = getClient();
      if (!client) return null;
      const itemId = Number(id);
      const token = getViewerToken();

      const { data: existing } = await client
        .from('item_likes')
        .select('id')
        .eq('item_id', itemId)
        .eq('viewer_token', token)
        .maybeSingle();

      const current = store.getItemById(id);
      let nextLiked = false;
      let nextLikes = current ? current.likes : 0;

      if (existing) {
        await client.from('item_likes').delete().eq('id', existing.id);
        nextLiked = false;
        nextLikes = Math.max(0, nextLikes - 1);
      } else {
        await client.from('item_likes').insert({ item_id: itemId, viewer_token: token });
        nextLiked = true;
        nextLikes = nextLikes + 1;
      }

      await client.from('items').update({ likes_count: nextLikes }).eq('id', itemId);

      if (current) {
        current.liked = nextLiked;
        current.likes = nextLikes;
        return current;
      }
      return { id: itemId, liked: nextLiked, likes: nextLikes };
    },
    async updateStatus(id, status) {
      const client = getClient();
      if (!client) return null;
      const itemId = Number(id);
      const { data, error } = await client
        .from('items')
        .update({ status })
        .eq('id', itemId)
        .select('*')
        .single();
      if (error || !data) return null;
      const current = store.getItemById(id);
      if (current) {
        current.status = data.status;
        return current;
      }
      return mapRowToItem(data, new Set());
    },
    async getOrCreateChatRoom(itemId) {
      const client = getClient();
      if (!client) return null;
      const token = getViewerToken();
      const numericId = Number(itemId);

      const { data: existing } = await client
        .from('chat_rooms')
        .select('*')
        .eq('item_id', numericId)
        .eq('buyer_token', token)
        .maybeSingle();
      if (existing) return existing;

      const { data: created, error } = await client
        .from('chat_rooms')
        .insert({ item_id: numericId, buyer_token: token })
        .select('*')
        .single();
      if (error) return null;

      // Increment chats_count on item
      const current = store.getItemById(numericId);
      if (current) {
        current.chats = (current.chats || 0) + 1;
        await client.from('items').update({ chats_count: current.chats }).eq('id', numericId);
      }
      return created;
    },
    async fetchChatMessages(roomId) {
      const client = getClient();
      if (!client || !roomId) return [];
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      if (error || !data) return [];
      return data;
    },
    async sendChatMessage(roomId, senderRole, content) {
      const client = getClient();
      if (!client || !roomId) return null;
      const { data, error } = await client
        .from('chat_messages')
        .insert({ room_id: roomId, sender_role: senderRole, content: content.slice(0, 300) })
        .select('*')
        .single();
      return error ? null : data;
    }
  };

  global.HobakStore = store;
})(window);
