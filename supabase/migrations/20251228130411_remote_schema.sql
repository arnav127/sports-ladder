


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."match_status" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PROCESSED',
    'CHALLENGED',
    'PROCESSING',
    'CANCELLED',
    'DISPUTED'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_match_elo"("match_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  m RECORD;
  p1 RECORD;
  p2 RECORD;
  new1 integer;
  new2 integer;
  expected1 double precision;
  expected2 double precision;
  K constant integer := 32;
  old1 integer;
  old2 integer;
BEGIN
  -- Lock match row
  SELECT * INTO m FROM public.matches WHERE id = match_uuid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'match not found';
  END IF;

  -- Only process matches that are CONFIRMED and not already PROCESSED
  IF m.status IS DISTINCT FROM 'CONFIRMED'::match_status THEN
    RAISE EXCEPTION 'match status is not CONFIRMED';
  END IF;

  IF m.winner_id IS NULL THEN
    RAISE EXCEPTION 'match has no winner';
  END IF;

  -- Lock player rows
  SELECT id, rating, matches_played INTO p1 FROM public.player_profiles WHERE id = m.player1_id FOR UPDATE;
  SELECT id, rating, matches_played INTO p2 FROM public.player_profiles WHERE id = m.player2_id FOR UPDATE;

  IF p1 IS NULL OR p2 IS NULL THEN
    RAISE EXCEPTION 'player not found';
  END IF;

  -- Ensure default rating if NULL
  IF p1.rating IS NULL THEN p1.rating := 1000; END IF;
  IF p2.rating IS NULL THEN p2.rating := 1000; END IF;

  old1 := p1.rating;
  old2 := p2.rating;

  -- ELO math
  expected1 := 1.0 / (1.0 + power(10.0, (p2.rating - p1.rating) / 400.0));
  expected2 := 1.0 / (1.0 + power(10.0, (p1.rating - p2.rating) / 400.0));

  new1 := round(p1.rating + K * ((CASE WHEN m.winner_id = p1.id THEN 1 ELSE 0 END) - expected1))::int;
  new2 := round(p2.rating + K * ((CASE WHEN m.winner_id = p2.id THEN 1 ELSE 0 END) - expected2))::int;

  -- Update player ratings and increment matches_played
  UPDATE public.player_profiles
    SET rating = new1,
        matches_played = COALESCE(matches_played, 0) + 1
    WHERE id = p1.id;

  UPDATE public.player_profiles
    SET rating = new2,
        matches_played = COALESCE(matches_played, 0) + 1
    WHERE id = p2.id;

  -- Record rating history rows
  INSERT INTO public.ratings_history(player_profile_id, match_id, old_rating, new_rating, delta, reason)
    VALUES (p1.id, match_uuid, old1, new1, new1 - old1, 'Match result'),
           (p2.id, match_uuid, old2, new2, new2 - old2, 'Match result');

  -- Mark match processed
  UPDATE public.matches
    SET status = 'PROCESSED'::match_status
    WHERE id = m.id;

  RETURN jsonb_build_object(
    'match_id', m.id,
    'player1', jsonb_build_object('id', p1.id, 'old', old1, 'new', new1),
    'player2', jsonb_build_object('id', p2.id, 'old', old2, 'new', new2)
  );
END;
$$;


ALTER FUNCTION "public"."process_match_elo"("match_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reactivate_profile_on_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Reactivate player1 and player2 if they exist
  IF NEW.player1_id IS NOT NULL THEN
    UPDATE public.player_profiles SET deactivated = false WHERE id = NEW.player1_id;
  END IF;

  IF NEW.player2_id IS NOT NULL THEN
    UPDATE public.player_profiles SET deactivated = false WHERE id = NEW.player2_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reactivate_profile_on_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_process_match_elo"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  res jsonb;
BEGIN
  -- Only act when status transitions to CONFIRMED
  IF (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status = 'CONFIRMED'::match_status THEN
    BEGIN
      -- Call the processing function
      res := process_match_elo(NEW.id);
      -- Optional: insert res into an audit table
    EXCEPTION WHEN others THEN
      -- By default, log a NOTICE and do not abort the update that set CONFIRMED.
      -- Change to RAISE to abort the outer transaction on failure.
      RAISE NOTICE 'ELO processing failed for match %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_process_match_elo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sport_id" "uuid",
    "player1_id" "uuid",
    "player2_id" "uuid",
    "winner_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "status" "public"."match_status" DEFAULT 'PENDING'::"public"."match_status",
    "action_token" "uuid" DEFAULT "gen_random_uuid"(),
    "message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reported_by" "uuid"
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sport_id" "uuid",
    "rating" integer DEFAULT 1000,
    "matches_played" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "deactivated" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."player_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."player_profiles_view" AS
 SELECT "p"."id",
    "p"."user_id",
    "p"."sport_id",
    "p"."rating",
    "p"."matches_played",
    "p"."created_at",
    "u"."email" AS "user_email",
    "u"."raw_user_meta_data" AS "user_metadata",
    COALESCE(("u"."raw_user_meta_data" ->> 'full_name'::"text"), (("u"."raw_user_meta_data" -> 'user_metadata'::"text") ->> 'full_name'::"text"), ("u"."email")::"text") AS "full_name",
    COALESCE(("u"."raw_user_meta_data" ->> 'avatar_url'::"text"), (("u"."raw_user_meta_data" -> 'user_metadata'::"text") ->> 'avatar_url'::"text")) AS "avatar_url"
   FROM ("public"."player_profiles" "p"
     LEFT JOIN "auth"."users" "u" ON (("p"."user_id" = "u"."id")))
  WHERE (COALESCE("p"."deactivated", false) = false);


ALTER VIEW "public"."player_profiles_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ratings_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_profile_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "old_rating" integer,
    "new_rating" integer,
    "delta" integer,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ratings_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_sport_id_key" UNIQUE ("user_id", "sport_id");



ALTER TABLE ONLY "public"."ratings_history"
    ADD CONSTRAINT "ratings_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_matches_action_token" ON "public"."matches" USING "btree" ("action_token");



CREATE INDEX "idx_matches_reported_by" ON "public"."matches" USING "btree" ("reported_by");



CREATE UNIQUE INDEX "idx_matches_unique_active_pair" ON "public"."matches" USING "btree" (LEAST(("player1_id")::"text", ("player2_id")::"text"), GREATEST(("player1_id")::"text", ("player2_id")::"text")) WHERE ("status" = ANY (ARRAY['CHALLENGED'::"public"."match_status", 'PENDING'::"public"."match_status", 'PROCESSING'::"public"."match_status"]));



CREATE INDEX "idx_matches_winner_id" ON "public"."matches" USING "btree" ("winner_id");



CREATE INDEX "idx_player_profiles_deactivated" ON "public"."player_profiles" USING "btree" ("deactivated");



CREATE INDEX "idx_ratings_history_player_created" ON "public"."ratings_history" USING "btree" ("player_profile_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "matches_after_status_trigger" AFTER UPDATE OF "status" ON "public"."matches" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."trigger_process_match_elo"();



CREATE OR REPLACE TRIGGER "reactivate_profile_on_match_trigger" AFTER INSERT ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."reactivate_profile_on_match"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "public"."player_profiles"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "public"."player_profiles"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "public"."player_profiles"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."player_profiles"("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ratings_history"
    ADD CONSTRAINT "ratings_history_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."ratings_history"
    ADD CONSTRAINT "ratings_history_player_profile_id_fkey" FOREIGN KEY ("player_profile_id") REFERENCES "public"."player_profiles"("id");



CREATE POLICY "Anyone can read profiles" ON "public"."player_profiles" FOR SELECT USING (true);



CREATE POLICY "Players can create matches" ON "public"."matches" FOR INSERT WITH CHECK (true);



CREATE POLICY "Players can read matches" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "Players can update their match" ON "public"."matches" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "player_profiles"."user_id"
   FROM "public"."player_profiles"
  WHERE ("player_profiles"."id" = "matches"."player1_id")
UNION
 SELECT "player_profiles"."user_id"
   FROM "public"."player_profiles"
  WHERE ("player_profiles"."id" = "matches"."player2_id"))));



CREATE POLICY "Public read" ON "public"."player_profiles" FOR SELECT USING (true);



CREATE POLICY "User can insert own profile" ON "public"."player_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."player_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































REVOKE ALL ON FUNCTION "public"."process_match_elo"("match_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_match_elo"("match_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_match_elo"("match_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_match_elo"("match_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reactivate_profile_on_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."reactivate_profile_on_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reactivate_profile_on_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_process_match_elo"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_process_match_elo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_process_match_elo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."player_profiles" TO "anon";
GRANT ALL ON TABLE "public"."player_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."player_profiles_view" TO "anon";
GRANT ALL ON TABLE "public"."player_profiles_view" TO "authenticated";
GRANT ALL ON TABLE "public"."player_profiles_view" TO "service_role";



GRANT ALL ON TABLE "public"."ratings_history" TO "anon";
GRANT ALL ON TABLE "public"."ratings_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings_history" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































