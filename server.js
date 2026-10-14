const cluster = require('cluster');
const os = require('os');
const express = require('express');
const compression = require('compression');

// ---------- 1. LOAD BALANCING (Node cluster) ----------
if (cluster.isPrimary) {
  const workers = Math.min(os.cpus().length, 4);
  console.log(`Primary process ${process.pid} started. Creating ${workers} workers...`);
  for (let i = 0; i < workers; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();

  // Compression: response chhota hota hai, site fast hoti hai
  app.use(compression());

  // ---------- 5. MONITORING (performance metrics) ----------
  const metrics = { requests: 0, totalTimeMs: 0, cacheHits: 0, cacheMisses: 0 };
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      metrics.requests++;
      metrics.totalTimeMs += Date.now() - start;
    });
    next();
  });

  // ---------- 3. DATABASE OPTIMIZATION ----------
  // Demo database: 1000 products. Map se index banaya (fast lookup by id)
  const products = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    price: 100 + i,
  }));
  const productsById = new Map(products.map((p) => [p.id, p]));

  // Slow database query ka simulation (200ms delay)
  const slowDbQuery = () =>
    new Promise((resolve) => setTimeout(() => resolve(products.slice(0, 50)), 200));

  // ---------- 2. CACHING ----------
  const cache = new Map();
  const CACHE_TTL = 30 * 1000; // 30 seconds

  async function getWithCache(key, fetchFn) {
    const item = cache.get(key);
    if (item && Date.now() - item.time < CACHE_TTL) {
      metrics.cacheHits++;
      return item.data; // database query nahi hui
    }
    metrics.cacheMisses++;
    const data = await fetchFn();
    cache.set(key, { data, time: Date.now() });
    return data;
  }

  // ---------- 4. STATIC FILES (browser caching + CDN in HTML) ----------
  app.use(express.static('public', { maxAge: '1d' }));

  // ---------- Routes ----------
  app.get('/api/products', async (req, res) => {
    const start = Date.now();
    const data = await getWithCache('products', slowDbQuery);
    res.json({ servedBy: process.pid, timeMs: Date.now() - start, data });
  });

  app.get('/api/products/:id', (req, res) => {
    const product = productsById.get(Number(req.params.id)); // indexed lookup
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', worker: process.pid }));

  app.get('/metrics', (req, res) => {
    res.json({
      worker: process.pid,
      totalRequests: metrics.requests,
      avgResponseTimeMs: metrics.requests ? (metrics.totalTimeMs / metrics.requests).toFixed(2) : 0,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
    });
  });

  app.listen(3000, () => console.log(`Worker ${process.pid} listening on port 3000`));
}