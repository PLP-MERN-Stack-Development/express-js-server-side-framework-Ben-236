const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Middleware ----------------
app.use(bodyParser.json());

// Custom Logger Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Simple Authentication Middleware
app.use((req, res, next) => {
  // Only protect API routes
  if (req.path.startsWith('/api')) {
    const apiKey = req.header('x-api-key');
    const validKey = process.env.API_KEY;
    if (apiKey !== validKey) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or missing API key' });
    }
  }
  next();
});

// ---------------- In-memory Database ----------------
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true,
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true,
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false,
  },
];

// ---------------- Helper: Validation ----------------
function validateProduct(product) {
  const errors = [];
  if (!product.name || typeof product.name !== 'string') errors.push('Invalid or missing name');
  if (typeof product.description !== 'string') errors.push('Invalid description');
  if (typeof product.price !== 'number' || isNaN(product.price)) errors.push('Invalid price');
  if (!product.category || typeof product.category !== 'string') errors.push('Invalid or missing category');
  if (typeof product.inStock !== 'boolean') errors.push('Invalid inStock value');
  return errors;
}

// ---------------- Routes ----------------

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// GET /api/products - List all products + filtering + pagination + search
app.get('/api/products', (req, res) => {
  let result = [...products];

  // Filtering by category
  if (req.query.category) {
    result = result.filter(
      (p) => p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }

  // Search by name
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(term));
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const start = (page - 1) * limit;
  const paged = result.slice(start, start + limit);

  res.json({
    total: result.length,
    page,
    limit,
    data: paged,
  });
});

// GET /api/products/:id - Get a product by ID
app.get('/api/products/:id', (req, res, next) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return next({ status: 404, message: 'Product not found' });
  }
  res.json(product);
});

// POST /api/products - Create new product
app.post('/api/products', (req, res, next) => {
  const errors = validateProduct(req.body);
  if (errors.length) {
    return next({ status: 400, message: errors.join(', ') });
  }

  const newProduct = { id: uuidv4(), ...req.body };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT /api/products/:id - Update a product
app.put('/api/products/:id', (req, res, next) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return next({ status: 404, message: 'Product not found' });
  }

  const errors = validateProduct(req.body);
  if (errors.length) {
    return next({ status: 400, message: errors.join(', ') });
  }

  products[index] = { id: req.params.id, ...req.body };
  res.json(products[index]);
});

// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', (req, res, next) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return next({ status: 404, message: 'Product not found' });
  }

  const deleted = products.splice(index, 1);
  res.json({ message: 'Product deleted', deleted });
});

// GET /api/products/stats - Count by category
app.get('/api/products/stats', (req, res) => {
  const stats = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  res.json({ total: products.length, byCategory: stats });
});

// ---------------- Error Handling ----------------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' });
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
