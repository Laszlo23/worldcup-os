-- Fan wishes / feedback / shoutouts
CREATE TABLE IF NOT EXISTS engagement_fan_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('feature', 'feedback', 'shoutout')),
  body TEXT NOT NULL,
  cheers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_fan_wishes_created
  ON engagement_fan_wishes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_fan_wishes_kind
  ON engagement_fan_wishes (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS engagement_fan_wish_cheers (
  wish_id UUID NOT NULL REFERENCES engagement_fan_wishes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wish_id, user_id)
);

-- Peer-to-peer sticker / legend NFT market (priced in XP)
CREATE TABLE IF NOT EXISTS engagement_sticker_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id TEXT NOT NULL REFERENCES engagement_sticker_defs(id) ON DELETE CASCADE,
  price_xp INTEGER NOT NULL CHECK (price_xp >= 25 AND price_xp <= 50000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sold', 'cancelled')),
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_sticker_listings_open
  ON engagement_sticker_listings (status, created_at DESC)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_engagement_sticker_listings_seller
  ON engagement_sticker_listings (seller_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_sticker_listings_one_open
  ON engagement_sticker_listings (seller_id, sticker_id)
  WHERE status = 'open';

-- Legend collectible cards (tradeable stickers)
INSERT INTO engagement_sticker_defs (id, title, description, set_id, rarity, image_url, earn_rule, xp_reward, sort_order)
VALUES
  ('legend-messi', 'Lionel Messi', 'World Cup 2022 icon · GOAT debate closer', 'set-legends', 'Legendary', '/soccer/221219105607-messi-crowd-world-cup-121822.webp', 'legend_mint_messi', 0, 1),
  ('legend-maradona', 'Diego Maradona', 'Hand of God · 1986 world stage', 'set-legends', 'Legendary', '/soccer/powerful-kick-of-a-soccer-player-with-fiery-ball-photo.webp', 'legend_mint_maradona', 0, 2),
  ('legend-pele', 'Pelé', 'Three World Cups · the original king', 'set-legends', 'Legendary', '/soccer/football-or-soccer-player-in-action-on-stadium-with-flashlights-kicking-ball-for-winning-goal.webp', 'legend_mint_pele', 0, 3),
  ('legend-cruyff', 'Johan Cruyff', 'Total Football architect', 'set-legends', 'Epic', '/soccer/soccer-players-heading.webp', 'legend_mint_cruyff', 0, 4),
  ('legend-ronaldinho', 'Ronaldinho', 'Smile & samba · Ballon d''Or magic', 'set-legends', 'Epic', '/soccer/Richarlison-of-Brazil-scores-second-goal-FIFA-World-Cup-Qatar-2022-Group-G-match-Brazil-and-Serbia-Lusail-Stadium-November-24-2022-Lusail-City-Qatar.webp', 'legend_mint_ronaldinho', 0, 5),
  ('legend-zidane', 'Zinedine Zidane', 'Volley in the final · elegance personified', 'set-legends', 'Epic', '/soccer/close-up-of-a-football-action-scene-with-competing-soccer-players-at-the-stadium-photo.webp', 'legend_mint_zidane', 0, 6)
ON CONFLICT (id) DO NOTHING;
