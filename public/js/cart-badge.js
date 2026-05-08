(function () {
  'use strict';

  var CART_KEY = 'sonhai_cart_items';
  var PRODUCTS_KEY = 'sonhai_products';
  var PRODUCTS_VERSION_KEY = 'sonhai_products_version';
  var CURRENT_VERSION = 4; // Bump when defaultProducts structure changes (v4: added Thuong Chien product)

  var defaultProducts = [
    { id: 1, slug: 'tuyet-mat-nhan-tinh', name: 'Tuyệt mật nhân tính', category: 'Nhân tính', price: 149000, original_price: 199000, emoji: '🧠', coverGradient: 'linear-gradient(145deg, #0D2137, #0A3B5C)', imageUrl: 'chuan/tuyet_mat_nhan_tinh.webp', description: 'Bạn có bao giờ tự hỏi tại sao mình biết điều đúng nhưng vẫn làm điều sai? Tại sao những nỗ lực của bạn không tạo ra kết quả tương xứng? Câu trả lời thường nằm ở những niềm tin giới hạn đã ăn sâu vào tiềm thức — những rào cản vô hình mà phần lớn chúng ta không hề hay biết.', rating: 4.9, sold_count: 512, status: 'published', pages: 320, format: 'PDF' },
    { id: 2, slug: 'thuc-tinh-nhan-thuc', name: 'Thức tỉnh nhận thức', category: 'Tư duy', price: 179000, original_price: 0, emoji: '💡', coverGradient: 'linear-gradient(145deg, #1A0D2E, #2D0A4E)', imageUrl: 'chuan/thuc_tinh_nhan_thuc.webp', description: 'Thức tỉnh nhận thức là hành trình đi vào lớp sâu nhất của tư duy con người — nơi hình thành cách bạn nhìn nhận bản thân, lý giải thế giới và đưa ra mọi quyết định trong cuộc sống.', rating: 4.8, sold_count: 345, status: 'published', pages: 280, format: 'PDF' },
    { id: 3, slug: 'logic-nguoi-ngheo', name: 'Logic người nghèo', category: 'Kỹ năng sống', price: 99000, original_price: 149000, emoji: '📊', coverGradient: 'linear-gradient(145deg, #0D2820, #0A3D2E)', imageUrl: 'chuan/logic_nguoi_ngheo.webp', description: 'Phân tích những sai lầm trong tư duy tài chính dẫn đến vòng lặp nghèo khó. Khám phá cách người giàu xây dựng hệ thống tài sản và phá vỡ lối mòn tư duy.', rating: 4.6, sold_count: 890, status: 'published', pages: 250, format: 'PDF' },
    { id: 4, slug: 'he-thong-manh-me', name: 'Hệ thống mạnh mẽ', category: 'Hệ thống', price: 139000, original_price: 0, emoji: '⚙️', coverGradient: 'linear-gradient(145deg, #1F1A08, #3D2E0A)', imageUrl: 'chuan/he_thong_manh_me.webp', description: 'Cách xây dựng hệ thống quy trình cho công việc và cuộc sống. Giúp bạn không còn phải dựa dẫm vào động lực, mà tự động hóa sự tiến bộ.', rating: 4.9, sold_count: 210, status: 'published', pages: 300, format: 'PDF' },
    { id: 5, slug: 'muu-luoc-tai-chinh', name: 'Mưu lược tài chính', category: 'Tài chính', price: 159000, original_price: 210000, emoji: '💰', coverGradient: 'linear-gradient(145deg, #1A0A0A, #3D0D0D)', imageUrl: 'chuan/muu_luoc_tai_chinh.webp', description: 'Các mưu lược và nguyên tắc quản lý tài chính hiệu quả. Từ việc giữ tiền đến nhân giống dòng tiền.', rating: 4.7, sold_count: 430, status: 'published', pages: 270, format: 'PDF' },
    { id: 6, slug: 'tu-duy-sau-sac', name: 'Tư duy sâu sắc', category: 'Tư duy', price: 119000, original_price: 0, emoji: '🔮', coverGradient: 'linear-gradient(145deg, #0A1A2E, #0D2845)', imageUrl: 'chuan/tu_duy_sau_sac.webp', description: 'Rèn luyện khả năng suy nghĩ đa chiều và sâu sắc. Nhìn thấu bản chất vấn đề qua màn sương mù của thông tin.', rating: 5.0, sold_count: 150, status: 'published', pages: 220, format: 'PDF' },
    { id: 7, slug: 'tu-duy-cuong-gia', name: 'Tư duy cường giả', category: 'Tư duy', price: 169000, original_price: 0, emoji: '⚡', coverGradient: 'linear-gradient(145deg, #0A1F0A, #0D3D1A)', imageUrl: 'chuan/tu_duy_cuong_gia.webp', description: 'Tâm lý học về sự tự tin và tư duy của người thành công. Đánh thức sức mạnh nội tại và khả năng lãnh đạo.', rating: 4.8, sold_count: 620, status: 'published', pages: 310, format: 'PDF' },
    { id: 8, slug: 'tinh-cam-bi-tich', name: 'Tình cảm bí tịch', category: 'Tình cảm', price: 109000, original_price: 0, emoji: '🌙', coverGradient: 'linear-gradient(145deg, #2E0D1A, #4E0A2D)', imageUrl: 'chuan/tinh_cam_bi_tich.webp', description: 'Khám phá những bí ẩn trong tình cảm con người — từ tình yêu, sự gắn bó đến lòng tin và phản bội.', rating: 4.7, sold_count: 180, status: 'published', pages: 240, format: 'PDF' },
    { id: 9, slug: 'xuyen-thau-nhan-tinh', name: 'Xuyên thấu nhân tính', category: 'Nhân tính', price: 149000, original_price: 0, emoji: '👁️', coverGradient: 'linear-gradient(145deg, #0D2137, #0A3B5C)', imageUrl: 'chuan/xuyen_thau_nhan_tinh.webp', description: 'Nhìn xuyên qua lớp mặt nạ xã hội để hiểu bản chất thật của người đối diện.', rating: 4.9, sold_count: 320, status: 'published', pages: 290, format: 'PDF' },
    { id: 10, slug: 'nhan-tinh-den-trang', name: 'Nhân tính đen trắng', category: 'Nhân tính', price: 139000, original_price: 0, emoji: '☯️', coverGradient: 'linear-gradient(145deg, #1A0D2E, #2D0A4E)', imageUrl: 'chuan/nhan_tinh_den_trang.webp', description: 'Hai mặt của nhân tính — thiện và ác, cho và nhận, yêu thương và ích kỷ.', rating: 4.8, sold_count: 275, status: 'published', pages: 260, format: 'PDF' },
    { id: 11, slug: 'an-chua-huyen-co', name: 'Ẩn chứa huyền cơ', category: 'Tư duy', price: 129000, original_price: 179000, emoji: '🏛️', coverGradient: 'linear-gradient(145deg, #1A1A0D, #2E2E0A)', imageUrl: 'chuan/an_chua_huyen_co.webp', description: 'Những nguyên lý ẩn giấu đằng sau thành công và vận mệnh — giải mã các quy luật bất biến của đời sống.', rating: 4.7, sold_count: 195, status: 'published', pages: 275, format: 'PDF' },
    { id: 12, slug: 'ban-chat-tai-chinh', name: 'Bản chất tài chính', category: 'Tài chính', price: 149000, original_price: 199000, emoji: '💎', coverGradient: 'linear-gradient(145deg, #0D1A2E, #0A2D4E)', imageUrl: 'chuan/ban_chat_tai_chinh.webp', description: 'Hiểu bản chất thực sự của tiền bạc và cách dòng tiền vận hành — nền tảng cho mọi quyết định tài chính thông minh.', rating: 4.8, sold_count: 310, status: 'published', pages: 290, format: 'PDF' },
    { id: 13, slug: 'goc-nhin-tao-lap', name: 'Góc nhìn tạo lập', category: 'Tư duy', price: 119000, original_price: 0, emoji: '🔭', coverGradient: 'linear-gradient(145deg, #0D2E1A, #0A4E2D)', imageUrl: 'chuan/goc_nhin_tao_lap.webp', description: 'Thay đổi góc nhìn để tạo lập thực tại mới — kỹ thuật reframe tư duy giúp bạn nhìn nhận mọi tình huống từ vị thế của người chiến thắng.', rating: 4.6, sold_count: 165, status: 'published', pages: 230, format: 'PDF' },
    { id: 14, slug: 'muu-luoc-tuoi-tre', name: 'Mưu lược tuổi trẻ', category: 'Kỹ năng sống', price: 109000, original_price: 149000, emoji: '🚀', coverGradient: 'linear-gradient(145deg, #2E0D0D, #4E1A0A)', imageUrl: 'chuan/muu_luoc_tuoir_tre.webp', description: 'Chiến lược và mưu lược dành cho người trẻ — xây dựng nền tảng vững chắc cho sự nghiệp và cuộc sống từ sớm.', rating: 4.9, sold_count: 420, status: 'published', pages: 260, format: 'PDF' },
    { id: 15, slug: 'thuong-chien', name: 'Thương chiến - Bí thuật làm chủ trận địa tiền bạc', category: 'Tài chính', price: 179000, original_price: 299000, emoji: '⚔️', coverGradient: 'linear-gradient(145deg, #2E1A0A, #4E2D1B)', imageUrl: 'chuan/thuong_chien.webp', description: 'Bí kíp chiến thắng trên thương trường, nắm vững nghệ thuật đàm phán và làm chủ cuộc chơi tài chính.', rating: 4.8, sold_count: 280, status: 'published', pages: 330, format: 'PDF' }
  ];

  /**
   * Normalize a product object to ensure consistent field names.
   * Supports both snake_case (admin) and camelCase (frontend).
   */
  function normalizeProduct(p) {
    // Auto-generate imageUrl from slug if not provided
    var imgUrl = p.imageUrl || p.image || '';
    if (!imgUrl && p.slug) {
      imgUrl = 'chuan/' + p.slug.replace(/-/g, '_') + '.webp';
    }
    return {
      id: p.id,
      slug: p.slug || '',
      name: p.name || '',
      category: p.category || p.category_name || '',
      price: p.price || 0,
      original_price: p.original_price || p.originalPrice || 0,
      emoji: p.emoji || p.icon || '📚',
      coverGradient: p.coverGradient || 'linear-gradient(145deg, #0A1A2E, #0D2845)',
      imageUrl: imgUrl,
      description: p.description || '',
      fullDescription: p.fullDescription || p.full_description || '',
      rating: p.rating || 4.5,
      sold_count: p.sold_count || p.soldCount || p.sold || 0,
      status: p.status || 'published',
      pages: p.pages || 250,
      format: p.format || 'PDF',
      image: imgUrl,
      // Keep aliases for backward compatibility
      originalPrice: p.original_price || p.originalPrice || 0,
      soldCount: p.sold_count || p.soldCount || p.sold || 0,
      category_name: p.category || p.category_name || '',
      icon: p.emoji || p.icon || '📚'
    };
  }

  function getProducts() {
    // Check if stored products are outdated (missing imageUrl etc.)
    var storedVersion = parseInt(localStorage.getItem(PRODUCTS_VERSION_KEY) || '0');
    if (storedVersion < CURRENT_VERSION) {
      // Force refresh with new defaults that include imageUrl
      var normalized = defaultProducts.map(normalizeProduct);
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
      localStorage.setItem(PRODUCTS_VERSION_KEY, String(CURRENT_VERSION));
      return normalized;
    }
    try {
      var stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          return parsed.map(normalizeProduct);
        }
      }
    } catch (e) {}
    // First time: save defaults
    var normalized = defaultProducts.map(normalizeProduct);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
    localStorage.setItem(PRODUCTS_VERSION_KEY, String(CURRENT_VERSION));
    return normalized;
  }

  function saveProducts(products) {
    var normalized = products.map(normalizeProduct);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalized));
  }

  function getCart() {
    try {
      var stored = localStorage.getItem(CART_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    refreshBadge();
  }

  function clearCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    refreshBadge();
  }

  function ensureStyle() {
    if (document.getElementById('sonhai-cart-badge-style')) return;
    var style = document.createElement('style');
    style.id = 'sonhai-cart-badge-style';
    style.textContent =
      '@keyframes sonhaiCartBadgePop{' +
      '0%{transform:scale(.65);box-shadow:0 0 0 rgba(0,212,212,0)}' +
      '45%{transform:scale(1.22);box-shadow:0 0 16px rgba(0,212,212,.55)}' +
      '100%{transform:scale(1);box-shadow:0 0 0 rgba(0,212,212,0)}' +
      '}' +
      '.cart-dot.cart-dot-pulse{animation:sonhaiCartBadgePop .42s ease both;}';
    document.head.appendChild(style);
  }

  function paintBadge(count) {
    ensureStyle();
    document.querySelectorAll('.cart-dot').forEach(function (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'flex';
        badge.style.width = count > 9 ? 'auto' : '15px';
        badge.style.minWidth = count > 9 ? '18px' : '15px';
        badge.style.padding = count > 9 ? '0 4px' : '';
        badge.setAttribute('aria-label', 'Gio hang co ' + count + ' san pham');
        badge.classList.remove('cart-dot-pulse');
        void badge.offsetWidth;
        badge.classList.add('cart-dot-pulse');
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
        badge.style.width = '';
        badge.style.minWidth = '';
        badge.style.padding = '';
        badge.removeAttribute('aria-label');
        badge.classList.remove('cart-dot-pulse');
      }
    });
  }

  function refreshBadge() {
    var cart = getCart();
    var count = cart.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
    paintBadge(count);
    
    // update #cart-badge text dynamically across pages
    var badgeId = document.getElementById('cart-badge');
    if (badgeId) {
       if (badgeId.textContent.indexOf('sản phẩm') > -1) {
           badgeId.textContent = count + ' sản phẩm';
       } else {
           badgeId.textContent = count;
           badgeId.style.display = count > 0 ? 'flex' : 'none';
       }
    }
  }

  async function addProduct(productId, quantity) {
    var cart = getCart();
    var products = getProducts();
    var product = products.find(function(p) { return String(p.id) === String(productId); });
    if (!product) throw new Error('Không tìm thấy sản phẩm.');

    var existing = cart.find(function(item) { return String(item.id) === String(productId); });
    if (existing) {
      existing.quantity = (existing.quantity || 1) + (quantity || 1);
      // Update product info in case it changed
      existing.name = product.name;
      existing.price = product.price;
      existing.emoji = product.emoji;
      existing.bg = product.coverGradient;
      existing.category = product.category;
      existing.imageUrl = product.imageUrl || '';
    } else {
      cart.push({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity || 1,
        emoji: product.emoji,
        bg: product.coverGradient,
        category: product.category,
        imageUrl: product.imageUrl || ''
      });
    }
    saveCart(cart);
    
    var count = cart.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
    return { success: true, data: { itemCount: count } };
  }

  function removeProduct(productId) {
    var cart = getCart();
    cart = cart.filter(function(item) { return String(item.id) !== String(productId) && String(item.productId) !== String(productId); });
    saveCart(cart);
  }

  window.SonHaiCartBadge = {
    setCount: paintBadge,
    addProduct: addProduct,
    removeProduct: removeProduct,
    refresh: refreshBadge,
    getCart: getCart,
    saveCart: saveCart,
    clearCart: clearCart,
    getProducts: getProducts,
    saveProducts: saveProducts
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshBadge);
  } else {
    refreshBadge();
  }

  window.addEventListener('storage', refreshBadge);
})();
