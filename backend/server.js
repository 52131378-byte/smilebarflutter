// sever.js
const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

require("dotenv").config();

const app = express();

const corsOptions = {
  origin: (origin, cb) => cb(null, true), // reflect request origin (dev-friendly)
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// Handle browser preflight requests cleanly
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Local file uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function verifyAdminToken(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, message: "Missing Authorization Bearer token" };
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const payload = jwt.verify(token, secret);

    // IMPORTANT FIX:
    // adminId can be 0 (falsy), so don't validate with `!payload.adminId`.
    const adminId = Number(payload?.adminId);

    if (
      !payload ||
      typeof payload !== "object" ||
      payload.role !== "admin" ||
      !Number.isInteger(adminId) ||
      adminId < 0
    ) {
      return { ok: false, status: 403, message: "Admin token required" };
    }

    return { ok: true, payload: { ...payload, adminId } };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }
}

function verifyClientToken(req) {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, message: "Missing Authorization Bearer token" };
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-me";
    const payload = jwt.verify(token, secret);

    const clientId = Number(payload?.clientId);

    if (
      !payload ||
      typeof payload !== "object" ||
      payload.role !== "client" ||
      !Number.isInteger(clientId) ||
      clientId <= 0
    ) {
      return { ok: false, status: 403, message: "Client token required" };
    }

    return { ok: true, payload: { ...payload, clientId } };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }
}

function requireAdmin(req, res, next) {
  const v = verifyAdminToken(req);
  if (!v.ok) return res.status(v.status).json({ message: v.message });

  const payload = v.payload;
  const jti = payload?.jti;

  if (!jti) {
    req.admin = payload;
    return next();
  }

  db.query("SELECT 1 FROM revoked_tokens WHERE jti = ? LIMIT 1", [jti], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (rows && rows.length > 0) return res.status(401).json({ message: "Invalid or expired token" });
    req.admin = payload;
    return next();
  });
}

function requireClient(req, res, next) {
  const v = verifyClientToken(req);
  if (!v.ok) return res.status(v.status).json({ message: v.message });

  const payload = v.payload;
  const jti = payload?.jti;

  if (!jti) {
    req.client = payload;
    return next();
  }

  db.query("SELECT 1 FROM revoked_tokens WHERE jti = ? LIMIT 1", [jti], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (rows && rows.length > 0) return res.status(401).json({ message: "Invalid or expired token" });
    req.client = payload;
    return next();
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname || "").slice(0, 10);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Admin-only: upload image file (multipart/form-data with field name "image")




// Client auth: register (public)

// Client auth: login (public)


// Client auth: "me" (requires client token)

// Client logout (requires client token)

// Admin logout (requires admin token)


function cleanString(v, maxLen) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function toPositiveInt(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}





// Admin: list all orders (requires admin token)
// app.get("/api/orders", requireAdmin, (req, res) => {
//   db.query(
//     `
//       SELECT
//         o.*,
//         c.email AS client_email,
//         c.name AS client_name
//       FROM orders o
//       JOIN clients c ON c.id = o.client_id
//       ORDER BY o.created_at DESC
//     `,
//     (err, orders) => {
//       if (err) return res.status(500).json({ message: "DB error" });
//       const rows = orders || [];
//       if (rows.length === 0) return res.json([]);

//       const orderIds = rows.map((o) => o.id);
//       db.query(
//         "SELECT * FROM order_items WHERE order_id IN (?) ORDER BY order_id ASC, id ASC",
//         [orderIds],
//         (err2, items) => {
//           if (err2) return res.status(500).json({ message: "DB error" });
//           const byOrder = new Map();
//           for (const it of items || []) {
//             if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
//             byOrder.get(it.order_id).push(it);
//           }
//           return res.json(rows.map((o) => ({ ...o, items: byOrder.get(o.id) || [] })));
//         }
//       );
//     }
//   );
// });




app.post("/api/orders/guest", (req, res) => {
  const body = req.body || {};

  const clientId = 1; // default guest client ID in your DB
  const fullName = String(body.full_name || "").slice(0, 255);
  const phone = String(body.phone || "").slice(0, 50);
  const address = String(body.address || "").slice(0, 500);
  const city = String(body.city || "").slice(0, 255);
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null;
  const paymentMethod =
    typeof body.payment_method === "string" && body.payment_method.trim()
      ? body.payment_method.trim().slice(0, 50)
      : "cash_on_delivery";

  if (!fullName || !phone || !address || !city) {
    return res.status(400).json({ message: "full_name, phone, address, city are required" });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) return res.status(400).json({ message: "items is required" });
  if (rawItems.length > 200) return res.status(400).json({ message: "too many items" });

  const qtyByItemId = new Map();
  for (const it of rawItems) {
    const itemId = parseInt(it?.item_id);
    const qty = parseInt(it?.quantity);
    if (!itemId || !qty) return res.status(400).json({ message: "each item must have item_id and quantity (positive integers)" });
    qtyByItemId.set(itemId, (qtyByItemId.get(itemId) || 0) + qty);
  }
  const itemIds = Array.from(qtyByItemId.keys());

  // Check items exist in DB
  db.query("SELECT id, name, price, stock_quantity FROM items WHERE id IN (?)", [itemIds], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    const found = rows || [];
    if (found.length !== itemIds.length) {
      const foundIds = new Set(found.map((r) => r.id));
      const missing = itemIds.filter((id) => !foundIds.has(id));
      return res.status(400).json({ message: "some items not found", missing_item_ids: missing });
    }

    // Check stock
    for (const r of found) {
      const qty = qtyByItemId.get(r.id) || 0;
      const stock = Number(r.stock_quantity);
      if (Number.isFinite(stock) && stock >= 0 && qty > stock) {
        return res.status(400).json({
          message: "out of stock",
          item_id: r.id,
          requested: qty,
          available: stock,
        });
      }
    }

    const orderItems = found.map((r) => {
      const qty = qtyByItemId.get(r.id) || 0;
      const unitPrice = Number(r.price);
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      return {
        item_id: r.id,
        name: String(r.name || "").slice(0, 255),
        unit_price: Number(unitPrice.toFixed(2)),
        quantity: qty,
        line_total: lineTotal,
      };
    });

    const subtotal = Number(orderItems.reduce((sum, it) => sum + it.line_total, 0).toFixed(2));
    const shipping = 0.0;
    const total = Number((subtotal + shipping).toFixed(2));

    db.beginTransaction((txErr) => {
      if (txErr) return res.status(500).json({ message: "DB error", error: txErr });

      const insertOrderSql = `
        INSERT INTO orders
          (client_id, full_name, phone, address, city, notes, payment_method, status, subtotal, shipping, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `;
      const insertOrderParams = [clientId, fullName, phone, address, city, notes, paymentMethod, subtotal, shipping, total];

      db.query(insertOrderSql, insertOrderParams, (err1, result1) => {
        if (err1) {
          console.error("Insert order error:", err1);
          return db.rollback(() => res.status(500).json({ message: "DB error", error: err1 }));
        }
        const orderId = result1.insertId;

        const updates = orderItems.slice();
        const decOne = (idx) => {
          if (idx >= updates.length) return afterStock();
          const it = updates[idx];
          db.query(
            "UPDATE items SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
            [it.quantity, it.item_id, it.quantity],
            (uErr, uRes) => {
              if (uErr) {
                console.error("Stock update error:", uErr);
                return db.rollback(() => res.status(500).json({ message: "DB error", error: uErr }));
              }
              if (!uRes || uRes.affectedRows !== 1) {
                return db.rollback(() =>
                  res.status(400).json({
                    message: "out of stock",
                    item_id: it.item_id,
                    requested: it.quantity,
                  })
                );
              }
              return decOne(idx + 1);
            }
          );
        };

        const afterStock = () => {
          const insertItemSql =
            "INSERT INTO order_items (order_id, item_id, name, unit_price, quantity, line_total) VALUES ?";
          const values = orderItems.map((it) => [orderId, it.item_id, it.name, it.unit_price, it.quantity, it.line_total]);

          db.query(insertItemSql, [values], (err2) => {
            if (err2) {
              console.error("Insert order_items error:", err2);
              return db.rollback(() => res.status(500).json({ message: "DB error", error: err2 }));
            }

            db.commit((err3) => {
              if (err3) {
                console.error("Commit error:", err3);
                return db.rollback(() => res.status(500).json({ message: "DB error", error: err3 }));
              }
              return res.status(201).json({
                id: orderId,
                status: "pending",
                payment_method: paymentMethod,
                subtotal,
                shipping,
                total,
                items: orderItems,
              });
            });
          });
        };

        decOne(0);
      });
    });
  });
});





// Public: list items
app.get("/api/items", (_req, res) => {
  const sql = `
    SELECT
      items.id,
      items.name,
      items.price,
      items.stock_quantity,
      items.image,
      category.name AS category
    FROM items
    JOIN category ON items.category_id = category.id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// Public: list categories
app.get("/api/categories", (_req, res) => {
  db.query("SELECT * FROM category", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});



// 404 handler
app.use((_req, res) => {
  return res.status(404).json({ message: "Not found" });
});

// Error handler
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  if (err && typeof err === "object" && err.message) {
    return res.status(400).json({ message: String(err.message) });
  }
  return res.status(500).json({ message: "Server error" });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});