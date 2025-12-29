-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- GLOBAL SETTINGS TABLES (SSOT - Master Lists)
-- ============================================================

-- Supported Countries (Global Master List)
CREATE TABLE IF NOT EXISTS supported_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    flag_emoji VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supported_countries_is_active ON supported_countries(is_active);
CREATE INDEX IF NOT EXISTS idx_supported_countries_display_order ON supported_countries(display_order);

-- Supported Locales (Global Master List)
CREATE TABLE IF NOT EXISTS supported_locales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100),
    flag_emoji VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supported_locales_is_active ON supported_locales(is_active);
CREATE INDEX IF NOT EXISTS idx_supported_locales_display_order ON supported_locales(display_order);

-- ============================================================
-- SEED DATA: Initial Countries
-- ============================================================

INSERT INTO supported_countries (code, name, native_name, flag_emoji, display_order) VALUES
    ('KR', 'South Korea', '대한민국', '🇰🇷', 1),
    ('US', 'United States', 'United States', '🇺🇸', 2),
    ('JP', 'Japan', '日本', '🇯🇵', 3),
    ('CN', 'China', '中国', '🇨🇳', 4),
    ('DE', 'Germany', 'Deutschland', '🇩🇪', 5),
    ('GB', 'United Kingdom', 'United Kingdom', '🇬🇧', 6),
    ('FR', 'France', 'France', '🇫🇷', 7),
    ('CA', 'Canada', 'Canada', '🇨🇦', 8),
    ('AU', 'Australia', 'Australia', '🇦🇺', 9),
    ('IN', 'India', 'भारत', '🇮🇳', 10),
    ('BR', 'Brazil', 'Brasil', '🇧🇷', 11),
    ('MX', 'Mexico', 'México', '🇲🇽', 12),
    ('IT', 'Italy', 'Italia', '🇮🇹', 13),
    ('ES', 'Spain', 'España', '🇪🇸', 14),
    ('NL', 'Netherlands', 'Nederland', '🇳🇱', 15),
    ('SE', 'Sweden', 'Sverige', '🇸🇪', 16),
    ('SG', 'Singapore', 'Singapore', '🇸🇬', 17),
    ('HK', 'Hong Kong', '香港', '🇭🇰', 18),
    ('TW', 'Taiwan', '台灣', '🇹🇼', 19),
    ('TH', 'Thailand', 'ประเทศไทย', '🇹🇭', 20),
    ('VN', 'Vietnam', 'Việt Nam', '🇻🇳', 21),
    ('ID', 'Indonesia', 'Indonesia', '🇮🇩', 22),
    ('MY', 'Malaysia', 'Malaysia', '🇲🇾', 23),
    ('PH', 'Philippines', 'Pilipinas', '🇵🇭', 24)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED DATA: Initial Locales
-- ============================================================

INSERT INTO supported_locales (code, name, native_name, flag_emoji, display_order) VALUES
    ('ko', 'Korean', '한국어', '🇰🇷', 1),
    ('en', 'English', 'English', '🇺🇸', 2),
    ('ja', 'Japanese', '日本語', '🇯🇵', 3),
    ('zh', 'Chinese', '中文', '🇨🇳', 4),
    ('zh-TW', 'Chinese (Traditional)', '繁體中文', '🇹🇼', 5),
    ('hi', 'Hindi', 'हिन्दी', '🇮🇳', 6),
    ('es', 'Spanish', 'Español', '🇪🇸', 7),
    ('fr', 'French', 'Français', '🇫🇷', 8),
    ('de', 'German', 'Deutsch', '🇩🇪', 9),
    ('pt', 'Portuguese', 'Português', '🇧🇷', 10),
    ('vi', 'Vietnamese', 'Tiếng Việt', '🇻🇳', 11),
    ('th', 'Thai', 'ไทย', '🇹🇭', 12),
    ('id', 'Indonesian', 'Bahasa Indonesia', '🇮🇩', 13)
ON CONFLICT (code) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS supported_locales;
DROP TABLE IF EXISTS supported_countries;
-- +goose StatementEnd
