(function () {
  'use strict';

  var CART_KEY = 'sonhai_cart_items';
  var PRODUCTS_KEY = 'sonhai_products';
  var PRODUCTS_VERSION_KEY = 'sonhai_products_version';
  var CURRENT_VERSION = 7; // v7: 3 categories moi + addCombo support

  var defaultProducts = [
    { id: 1, slug: 'tuyet-mat-nhan-tinh', name: 'Tuyệt mật nhân tính', category: 'Thấu hiểu nhân tính', price: 99000, original_price: 199000, emoji: '', coverGradient: 'linear-gradient(145deg, #1a0a2e, #2d1b4e)', imageUrl: 'product/anh-chuan/tuyet-mat-nhan-tinh.webp', description: 'Khám phá những bí mật ẩn giấu sâu thẳm trong bản chất con người, giúp bạn hiểu rõ động cơ và hành vi của mọi người xung quanh.', rating: 4.9, sold_count: 512, status: 'published', pages: 280, format: 'PDF' },
    { id: 2, slug: 'thuc-tinh-nhan-thuc', name: 'Thức tỉnh nhận thức', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A1A2E, #0D2845)', imageUrl: 'product/anh-chuan/thuc-tinh-nhan-thuc.webp', description: 'Hành trình thức tỉnh tư duy, phá vỡ những niềm tin giới hạn và xây dựng nhận thức mới để thay đổi cuộc sống.', rating: 4.8, sold_count: 345, status: 'published', pages: 320, format: 'PDF' },
    { id: 3, slug: 'logic-nguoi-ngheo', name: 'Logic người nghèo', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #2E1A0A, #4E3B1B)', imageUrl: 'product/anh-chuan/logic-nguoi-ngheo.webp', description: 'Phân tích sâu sắc những kiểu tư duy khiến người ta mãi nghèo và cách thay đổi mindset để xây dựng tài chính vững mạnh.', rating: 4.6, sold_count: 890, status: 'published', pages: 260, format: 'PDF' },
    { id: 4, slug: 'he-thong-manh-me', name: 'Hệ thống mạnh mẽ', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A2E1A, #1B4E2D)', imageUrl: 'product/anh-chuan/he-thong-manh-me.webp', description: 'Xây dựng hệ thống tư duy và hành động mạnh mẽ, giúp bạn đạt được mục tiêu một cách bền vững và hiệu quả.', rating: 4.9, sold_count: 210, status: 'published', pages: 300, format: 'PDF' },
    { id: 5, slug: 'muu-luoc-tai-chinh', name: 'Mưu lược tài chính', category: 'Làm chủ tài chính', price: 179000, original_price: 299000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A1A2E, #1B2D4E)', imageUrl: 'product/anh-chuan/muu-luoc-tai-chinh.webp', description: 'Chiến lược quản lý tài chính thông minh, từ tiết kiệm đến đầu tư, giúp bạn làm chủ tiền bạc và xây dựng tương lai tài chính.', rating: 4.7, sold_count: 430, status: 'published', pages: 290, format: 'PDF' },
    { id: 6, slug: 'tu-duy-sau-sac', name: 'Tư duy sâu sắc', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #1A0A2E, #2D1B4E)', imageUrl: 'product/anh-chuan/tu-duy-sau-sac.webp', description: 'Rèn luyện khả năng tư duy phản biện và phân tích sâu sắc, giúp bạn nhìn nhận vấn đề từ nhiều góc độ khác nhau.', rating: 5.0, sold_count: 150, status: 'published', pages: 310, format: 'PDF' },
    { id: 7, slug: 'tu-duy-cuong-gia', name: 'Tư duy cường giả', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #2E0A0A, #4E1B1B)', imageUrl: 'product/anh-chuan/tu-duy-cuon-gia.webp', description: 'Phát triển tư duy của người mạnh mẽ, học cách đối mặt với thử thách và biến khó khăn thành cơ hội.', rating: 4.8, sold_count: 620, status: 'published', pages: 275, format: 'PDF' },
    { id: 8, slug: 'tinh-cam-bi-tich', name: 'Tình cảm bí tịch', category: 'Thấu hiểu nhân tính', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #2E0A1A, #4E1B2D)', imageUrl: 'product/anh-chuan/tinh-cam-bi-tich.webp', description: 'Giải mã những bí ẩn trong tình cảm và các mối quan hệ, giúp bạn hiểu và xử lý cảm xúc thông minh hơn.', rating: 4.7, sold_count: 180, status: 'published', pages: 265, format: 'PDF' },
    { id: 9, slug: 'xuyen-thau-nhan-tinh', name: 'Xuyên thấu nhân tính', category: 'Thấu hiểu nhân tính', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A2E2E, #1B4E4E)', imageUrl: 'product/anh-chuan/xuyen-thau-nhan-tinh.webp', description: 'Nhìn thấu bản chất con người qua hành vi và lời nói, giúp bạn đọc vị đối phương và ứng xử phù hợp.', rating: 4.9, sold_count: 320, status: 'published', pages: 295, format: 'PDF' },
    { id: 10, slug: 'nhan-tinh-den-trang', name: 'Nhân tính đen trắng', category: 'Thấu hiểu nhân tính', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #1A1A2E, #2D2D4E)', imageUrl: 'product/anh-chuan/nhan-tinh-den-trang.webp', description: 'Phân tích hai mặt sáng tối của nhân tính, giúp bạn nhận diện bản chất thực sự đằng sau mỗi con người.', rating: 4.8, sold_count: 275, status: 'published', pages: 285, format: 'PDF' },
    { id: 11, slug: 'thuong-chien', name: 'Thương chiến - Bí thuật làm chủ trận địa tiền bạc', category: 'Làm chủ tài chính', price: 179000, original_price: 299000, emoji: '', coverGradient: 'linear-gradient(145deg, #2E1A0A, #4E2D1B)', imageUrl: 'product/anh-chuan/thuong-chien.webp', description: 'Bí kíp chiến thắng trên thương trường, nắm vững nghệ thuật đàm phán và làm chủ cuộc chơi tài chính.', rating: 4.8, sold_count: 280, status: 'published', pages: 330, format: 'PDF' },
    { id: 12, slug: 'muu-luoc-tuoi-tre', name: 'Mưu lược tuổi trẻ', category: 'Thay đổi tư duy', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A1A2E, #1B3D4E)', imageUrl: 'product/anh-chuan/muu-luoc-tuoi-tre.webp', description: 'Chiến lược xây dựng sự nghiệp và cuộc sống dành riêng cho tuổi trẻ, giúp bạn tận dụng tối đa thời gian vàng.', rating: 4.9, sold_count: 420, status: 'published', pages: 270, format: 'PDF' },
    { id: 13, slug: 'goc-nhin-tao-lap', name: 'Góc nhìn tạo lập - Luật ngầm', category: 'Thấu hiểu nhân tính', price: 179000, original_price: 299000, emoji: '', coverGradient: 'linear-gradient(145deg, #1A2E0A, #2D4E1B)', imageUrl: 'product/anh-chuan/goc-nhin-tao-lap.webp', description: 'Khám phá những luật ngầm chi phối xã hội và cách tạo lập góc nhìn chiến lược để thành công.', rating: 4.6, sold_count: 165, status: 'published', pages: 305, format: 'PDF' },
    { id: 14, slug: 'ban-chat-tai-chinh', name: 'Bản chất tài chính', category: 'Làm chủ tài chính', price: 179000, original_price: 299000, emoji: '', coverGradient: 'linear-gradient(145deg, #2E2E0A, #4E4E1B)', imageUrl: 'product/anh-chuan/ban-chat-tai-chinh.webp', description: 'Hiểu bản chất thực sự của tiền bạc và hệ thống tài chính, xây dựng nền tảng kiến thức vững chắc để quản lý tài sản.', rating: 4.8, sold_count: 310, status: 'published', pages: 315, format: 'PDF' },
    { id: 15, slug: 'an-chua-huyen-co', name: 'Ẩn chứa huyền cơ', category: 'Thấu hiểu nhân tính', price: 129000, original_price: 249000, emoji: '', coverGradient: 'linear-gradient(145deg, #0A0A2E, #1B1B4E)', imageUrl: 'product/anh-chuan/an-chua-huyen-co.webp', description: 'Khám phá những bí ẩn ẩn giấu trong cuộc sống và con người, giải mã những quy luật ngầm chi phối mọi sự việc.', rating: 4.7, sold_count: 195, status: 'published', pages: 290, format: 'PDF' }
  ];

  /**
   * Normalize a product object to ensure consistent field names.
   * Supports both snake_case (admin) and camelCase (frontend).
   */
  function normalizeProduct(p) {
    // Auto-generate imageUrl from slug if not provided
    var imgUrl = p.imageUrl || p.image || '';
    if (!imgUrl && p.slug) {
      imgUrl = 'product/anh-chuan/' + p.slug + '.webp';
    }
    return {
      id: p.id,
      slug: p.slug || '',
      name: p.name || '',
      category: p.category || p.category_name || '',
      price: p.price || 0,
      original_price: p.original_price || p.originalPrice || 0,
      emoji: p.emoji || p.icon || '',
      coverGradient: p.coverGradient || 'linear-gradient(145deg, #0A1A2E, #0D2845)',
      imageUrl: imgUrl,
      description: p.description || '',
      fullDescription: p.fullDescription || p.full_description || '',
      rating: p.rating || 0,
      sold_count: p.sold_count || p.soldCount || p.sold || 0,
      status: p.status || 'published',
      pages: p.pages || 0,
      format: p.format || '',
      image: imgUrl,
      // Keep aliases for backward compatibility
      originalPrice: p.original_price || p.originalPrice || 0,
      soldCount: p.sold_count || p.soldCount || p.sold || 0,
      category_name: p.category || p.category_name || '',
      icon: p.emoji || p.icon || ''
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

  function addCombo(comboData) {
    var cart = getCart();
    var comboId = 'combo-' + (comboData.id || Date.now());
    var existing = cart.find(function(item) { return String(item.id) === comboId; });
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      var slugs = comboData.productSlugs || [];
      // Fallback: resolve slugs from products if empty
      if (slugs.length === 0 || slugs.every(function(s) { return !s; })) {
        var products = getProducts();
        var ids = comboData.productIds || [];
        slugs = ids.map(function(pid) {
          var p = products.find(function(pr) { return String(pr.id) === String(pid); });
          return p ? p.slug : '';
        });
      }
      var firstSlug = slugs.find(function(s) { return !!s; }) || '';
      var comboImg = firstSlug ? 'product/anh-chuan/' + firstSlug + '.webp' : '';
      cart.push({
        id: comboId,
        productId: comboId,
        name: comboData.name || 'Combo',
        price: comboData.comboPrice || 0,
        quantity: 1,
        emoji: '',
        bg: 'linear-gradient(145deg, #0a2e2e, #1b4e4e)',
        category: 'Combo',
        imageUrl: comboImg,
        isCombo: true,
        comboProductIds: comboData.productIds || [],
        comboProductNames: comboData.productNames || [],
        comboProductSlugs: slugs
      });
    }
    saveCart(cart);
    var count = cart.reduce(function(sum, item) { return sum + (item.quantity || 1); }, 0);
    return { success: true, data: { itemCount: count } };
  }

  window.SonHaiCartBadge = {
    setCount: paintBadge,
    addProduct: addProduct,
    addCombo: addCombo,
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
