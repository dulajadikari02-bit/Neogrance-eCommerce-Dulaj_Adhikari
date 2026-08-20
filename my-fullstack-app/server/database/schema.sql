-- ============================================================================
-- Neogrance â€” full database setup (run this once)
--   mysql -u root -p < database/schema.sql
-- Creates the database, every table, and seed data (categories, sample
-- products + variants, one admin user, one promo banner row).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS neogrance
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE neogrance;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30)  NULL,
  role          ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- addresses (a user can save several; one flagged default)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  label          VARCHAR(60)  NOT NULL DEFAULT 'Home',
  recipient_name VARCHAR(120) NOT NULL,
  phone          VARCHAR(30)  NOT NULL,
  line1          VARCHAR(190) NOT NULL,
  line2          VARCHAR(190) NULL,
  city           VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(20)  NOT NULL,
  country        VARCHAR(80)  NOT NULL DEFAULT 'Sri Lanka',
  is_default     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- categories (mens / womens / unisex, incl. a unisex clothing entry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  slug           VARCHAR(140) NOT NULL UNIQUE,
  gender         ENUM('men', 'women', 'unisex') NOT NULL,
  type           ENUM('fragrance', 'clothing') NOT NULL DEFAULT 'fragrance',
  image_url      VARCHAR(500) NULL,
  display_order  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(190) NOT NULL,
  slug                VARCHAR(220) NOT NULL UNIQUE,
  description         TEXT NULL,
  top_notes           TEXT NULL,
  heart_notes         TEXT NULL,
  base_notes          TEXT NULL,
  price               DECIMAL(10,2) NOT NULL,
  cost_price          DECIMAL(10,2) NULL,
  bottle_ml           INT UNSIGNED NULL,
  full_bottle_available TINYINT(1) NOT NULL DEFAULT 1,
  stock               INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  category_id         INT UNSIGNED NULL,
  gender              ENUM('men', 'women', 'unisex') NOT NULL DEFAULT 'unisex',
  image_url           VARCHAR(500) NOT NULL,
  hover_image_url     VARCHAR(500) NULL,
  image3_url          VARCHAR(500) NULL,
  sku                 VARCHAR(60) NOT NULL UNIQUE,
  view_count          INT UNSIGNED NOT NULL DEFAULT 0,
  sold_count          INT UNSIGNED NOT NULL DEFAULT 0,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_products_created_at (created_at),
  INDEX idx_products_gender (gender),
  INDEX idx_products_category (category_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- product_variants (e.g. 5ML Decant / 10ML Decant / Full Bottle)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(120) NOT NULL,
  label       VARCHAR(120) NULL,
  price       DECIMAL(10,2) NOT NULL,
  ml          INT UNSIGNED NULL,
  sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_variants_product (product_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- reviews (go live only after admin approval)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id    INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NULL,
  reviewer_name VARCHAR(120) NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL,
  review_text   TEXT NOT NULL,
  image_url     VARCHAR(500) NULL,
  status        ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5), -- only allow star ratings from 1 to 5
  INDEX idx_reviews_product_status (product_id, status),
  INDEX idx_reviews_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- orders / order_items (guest checkout allowed, user_id nullable)
-- ----------------------------------------------------------------------------
-- user_id can be NULL and uses ON DELETE SET NULL below (not CASCADE), so if a
-- customer's account is deleted, their past orders stay in the system for records —
-- they just stop being linked to a user.
CREATE TABLE IF NOT EXISTS orders (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NULL,
  status           ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  first_name       VARCHAR(80) NOT NULL,
  last_name        VARCHAR(80) NOT NULL,
  email            VARCHAR(190) NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  address1         VARCHAR(190) NOT NULL,
  city             VARCHAR(100) NOT NULL,
  postal_code      VARCHAR(20) NOT NULL,
  payment_method   ENUM('cod', 'bank_transfer') NOT NULL DEFAULT 'cod',
  payment_slip_url VARCHAR(500) NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  shipping_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED NULL,
  product_name  VARCHAR(190) NOT NULL,
  variant_name  VARCHAR(120) NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  unit_cost     DECIMAL(10,2) NULL,
  quantity      INT UNSIGNED NOT NULL,
  line_total    DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- push_tokens (Expo push tokens for admin devices — order/review/stock alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token       VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_push_tokens_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- cart_items (per-user server-side cart — synced across devices once logged in)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  variant_id  INT UNSIGNED NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_cart_items_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- wishlist_items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishlist_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_wishlist_user_product (user_id, product_id),
  INDEX idx_wishlist_items_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- contact_messages (Contact Us form submissions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  subject     VARCHAR(190) NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_messages_read (is_read)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- newsletter_subscribers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(190) NOT NULL UNIQUE,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  subscribed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- promo_banner (single editable row shown on the homepage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_banner (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(190) NOT NULL,
  subtitle     VARCHAR(190) NULL,
  description  VARCHAR(500) NULL,
  image_url    VARCHAR(500) NULL,
  button_text  VARCHAR(80) NULL,
  button_link  VARCHAR(300) NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- media (uploaded images stored as binary data in the database itself,
-- instead of on the app server's disk — Hostinger's Node.js hosting gives
-- each deploy a fresh, separate folder, so anything saved to local disk
-- (like a plain uploads/ folder) is lost on the very next redeploy. Storing
-- image bytes here means they survive redeploys since they live in MySQL.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mime_type   VARCHAR(100) NOT NULL,
  data        LONGBLOB NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- hero_banner (single editable row — the big full-screen banner at the very
-- top of the homepage, separate from promo_banner further down the page)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_banner (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(190) NULL,
  subtitle     VARCHAR(190) NULL,
  image_url    VARCHAR(500) NULL,
  button_text  VARCHAR(80) NULL,
  button_link  VARCHAR(300) NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- Seed data
-- ============================================================================

-- Default admin login: admin@neogrance.com / Admin@12345  (change after first login)
INSERT INTO users (name, email, password_hash, role)
VALUES ('Neogrance Admin', 'admin@neogrance.com',
        '$2a$10$DAfZv2J.lvlLFHvnelaNJ.M2isC/UZUUHEPiF35XJE6OOgPDdNeia', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, gender, type, image_url, display_order) VALUES
  ('Men''s Fragrances', 'mens-fragrances', 'men', 'fragrance',
   'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=800&auto=format&fit=crop', 1),
  ('Women''s Fragrances', 'womens-fragrances', 'women', 'fragrance',
   'https://images.unsplash.com/photo-1594034283228-ea517075c3db?q=80&w=800&auto=format&fit=crop', 2),
  ('Unisex Fragrances', 'unisex-fragrances', 'unisex', 'fragrance',
   'https://images.unsplash.com/photo-1615486171448-4fdca1547361?q=80&w=800&auto=format&fit=crop', 3),
  ('Unisex Clothing', 'unisex-clothing', 'unisex', 'clothing',
   'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO promo_banner (title, subtitle, description, image_url, button_text, button_link, is_active)
VALUES (
  'The Midnight Collection', 'Exclusive Release',
  'Discover our most exclusive fragrances, crafted for the night. Embrace the pure essence of minimalist luxury.',
  'https://images.unsplash.com/photo-1615486171448-4fdca1547361?q=80&w=1600&auto=format&fit=crop',
  'Explore Collection', '/unisex', 1
);
