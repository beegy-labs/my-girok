-- +goose Up
ALTER TABLE authorization_models ADD COLUMN notes TEXT;

-- +goose Down
ALTER TABLE authorization_models DROP COLUMN IF EXISTS notes;
