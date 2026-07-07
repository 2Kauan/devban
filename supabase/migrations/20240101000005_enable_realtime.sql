-- Add tables to the realtime publication
-- This allows clients to subscribe to changes using supabase.channel()

-- Add them to publication
ALTER PUBLICATION supabase_realtime ADD TABLE cards, columns, categories, card_categories;
