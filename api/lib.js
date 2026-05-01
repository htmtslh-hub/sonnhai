// Mock data for API routes
const mockData = {
  products: [
    { id: 1, name: 'JavaScript từ A-Z', icon: '📚', category: 'ebook', price: 299000, originalPrice: 399000, sold: 45, stock: 100, status: 'published', description: 'Sách JavaScript toàn tập', format: 'PDF', pages: 320, image: '', createdAt: '2026-04-01', updatedAt: '2026-05-01' },
    { id: 2, name: 'React Master Course', icon: '⚛️', category: 'course', price: 499000, originalPrice: 699000, sold: 38, stock: 50, status: 'published', description: 'Khóa học React từ cơ bản đến nâng cao', format: 'PDF', pages: 450, image: '', createdAt: '2026-04-05', updatedAt: '2026-05-01' },
    { id: 3, name: 'Node.js Backend', icon: '🟢', category: 'course', price: 399000, originalPrice: 499000, sold: 32, stock: 75, status: 'published', description: 'Backend với Node.js và Express', format: 'PDF', pages: 380, image: '', createdAt: '2026-04-10', updatedAt: '2026-05-01' },
    { id: 4, name: 'Python cho AI', icon: '🐍', category: 'course', price: 599000, originalPrice: 799000, sold: 28, stock: 60, status: 'published', description: 'Python cho Machine Learning và AI', format: 'PDF', pages: 520, image: '', createdAt: '2026-04-15', updatedAt: '2026-05-01' },
    { id: 5, name: 'UI/UX Design', icon: '🎨', category: 'ebook', price: 349000, originalPrice: 449000, sold: 24, stock: 80, status: 'published', description: 'Thiết kế UI/UX chuyên nghiệp', format: 'PDF', pages: 280, image: '', createdAt: '2026-04-20', updatedAt: '2026-05-01' },
    { id: 6, name: 'TypeScript Guide', icon: '📘', category: 'ebook', price: 249000, originalPrice: 349000, sold: 18, stock: 100, status: 'draft', description: 'Hướng dẫn TypeScript toàn tập', format: 'PDF', pages: 300, image: '', createdAt: '2026-04-25', updatedAt: '2026-05-01' }
  ],
  orders: [],
  users: [],
  carts: {}
};

module.exports = { mockData };
