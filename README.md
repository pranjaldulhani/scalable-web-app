# Scalable Web App

## Aim
To implement scalability and performance best practices in a simple web application.

## Features
1. **Load Balancing:** Node.js cluster module creates multiple workers to share traffic.
2. **Caching:** In-memory cache (30 seconds TTL) reduces database queries.
3. **Database Optimization:** Indexed lookup using Map and limited records per request.
4. **CDN:** Bootstrap is loaded from a CDN; static files use browser caching.
5. **Monitoring:** `/metrics` and `/health` endpoints show performance data.

## Tech Stack
Node.js, Express, Bootstrap (CDN)

## How to Run
1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`

## Results
- First request took about 200 ms (database query).
- Cached requests took 0-3 ms.
- Average response time dropped from 114 ms to 7.78 ms.
- Cache hits: 42, cache misses: 3.


## Note
Each worker has its own cache. In real projects, a shared cache like Redis is used.