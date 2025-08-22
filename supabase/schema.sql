-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create custom types
CREATE TYPE card_state AS ENUM ('new', 'learning', 'review', 'relearning', 'suspended', 'buried');
CREATE TYPE challenge_type AS ENUM ('daily', 'weekly', 'monthly', 'community', 'friend', 'seasonal', 'epic');
CREATE TYPE notification_type AS ENUM (
  'achievement_earned',
  'challenge_completed', 
  'streak_reminder',
  'friend_request',
  'study_reminder',
  'deck_shared'
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 100,
  gems INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  preferences JSONB DEFAULT '{
    "theme": "system",
    "language": "en", 
    "notifications": true,
    "soundEffects": true,
    "dailyGoal": 50,
    "timezone": "UTC"
  }'::jsonb
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Decks table
CREATE TABLE decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  card_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{
    "newCardsPerDay": 20,
    "maxReviewsPerDay": 200,
    "easyBonus": 1.3,
    "intervalModifier": 1.0,
    "maximumInterval": 36500,
    "minimumInterval": 1
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general'
);

-- Enable RLS on decks
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

-- Deck policies
CREATE POLICY "Users can view own decks" ON decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public decks" ON decks FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert own decks" ON decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON decks FOR DELETE USING (auth.uid() = user_id);

-- Cards table
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  card_type JSONB DEFAULT '{"type": "basic"}'::jsonb,
  
  -- Anki-style scheduling fields
  state card_state DEFAULT 'new',
  queue INTEGER DEFAULT 0,
  due INTEGER DEFAULT 0,
  interval_days INTEGER DEFAULT 0,
  ease_factor INTEGER DEFAULT 2500,
  review_count INTEGER DEFAULT 0,
  lapse_count INTEGER DEFAULT 0,
  learning_step INTEGER DEFAULT 0,
  
  -- Timing and performance
  total_study_time INTEGER DEFAULT 0,
  average_answer_time INTEGER DEFAULT 0,
  
  -- Metadata
  flags INTEGER DEFAULT 0,
  original_due INTEGER DEFAULT 0,
  
  -- Gamification
  xp_awarded INTEGER DEFAULT 0,
  difficulty_rating INTEGER DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Card policies (users can access cards from their decks)
CREATE POLICY "Users can view cards from own decks" ON cards FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert cards to own decks" ON cards FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()
  ));
CREATE POLICY "Users can update cards in own decks" ON cards FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete cards from own decks" ON cards FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.user_id = auth.uid()
  ));

-- Study sessions table
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
  cards_studied INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  session_duration_ms INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on study sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- User streaks table
CREATE TABLE user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  freeze_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own streak" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak" ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streak" ON user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Achievements table
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirements JSONB NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  coin_reward INTEGER DEFAULT 0,
  is_secret BOOLEAN DEFAULT false,
  rarity TEXT DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User achievements table
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  progress_data JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on user achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_streaks (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update card count in decks
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE decks SET card_count = card_count + 1 WHERE id = NEW.deck_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE decks SET card_count = card_count - 1 WHERE id = OLD.deck_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for card count
CREATE TRIGGER cards_insert_trigger
  AFTER INSERT ON cards
  FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

CREATE TRIGGER cards_delete_trigger
  AFTER DELETE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

-- Indexes for performance
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_state ON cards(state);
CREATE INDEX idx_cards_due ON cards(due);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Insert some default achievements
INSERT INTO achievements (name, description, icon, category, requirements, xp_reward, coin_reward) VALUES
  ('First Study', 'Complete your first study session', '🎯', 'study_milestones', '{"type": "study_sessions", "value": 1, "operator": "gte"}', 50, 10),
  ('Perfect Score', 'Get 100% accuracy in a study session', '💯', 'accuracy', '{"type": "session_accuracy", "value": 100, "operator": "eq"}', 100, 25),
  ('Week Warrior', 'Study for 7 days in a row', '🔥', 'streaks', '{"type": "streak", "value": 7, "operator": "gte"}', 200, 50),
  ('Deck Master', 'Create your first deck', '📚', 'study_milestones', '{"type": "decks_created", "value": 1, "operator": "gte"}', 75, 15);