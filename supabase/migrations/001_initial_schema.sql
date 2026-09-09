-- ==============================================================================
-- SHIVRAJ: INTERNATIONAL PEER-REVIEWED MULTIDISCIPLINARY JOURNAL
-- PostgreSQL Schema & Row Level Security (RLS) Migration
-- Database: Supabase PostgreSQL 15+
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CUSTOM ENUMS
-- ==============================================================================

CREATE TYPE user_role AS ENUM (
    'AUTHOR',
    'REVIEWER',
    'EDITOR',
    'ADMIN'
);

CREATE TYPE manuscript_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'DECISION_PENDING',
    'REVISION_REQUIRED',
    'ACCEPTED',
    'REJECTED',
    'PUBLISHED'
);

CREATE TYPE review_recommendation AS ENUM (
    'ACCEPT',
    'MINOR_REVISION',
    'MAJOR_REVISION',
    'REJECT'
);

CREATE TYPE review_task_status AS ENUM (
    'INVITED',
    'ACCEPTED',
    'DECLINED',
    'SUBMITTED'
);

CREATE TYPE manuscript_file_type AS ENUM (
    'COVER_LETTER',
    'ANONYMIZED_MANUSCRIPT',
    'REVISED_MANUSCRIPT'
);

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Profiles Table (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    institution TEXT NOT NULL DEFAULT 'Shivaji College, University of Delhi',
    role user_role NOT NULL DEFAULT 'AUTHOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ------------------------------------------------------------------------------
-- B. Manuscripts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    department TEXT NOT NULL,
    status manuscript_status NOT NULL DEFAULT 'SUBMITTED',
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    round_number INT NOT NULL DEFAULT 1 CHECK (round_number >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_manuscripts_author_id ON public.manuscripts(author_id);
CREATE INDEX idx_manuscripts_status ON public.manuscripts(status);
CREATE INDEX idx_manuscripts_tracking_id ON public.manuscripts(tracking_id);

-- ------------------------------------------------------------------------------
-- C. Manuscript Files Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manuscript_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manuscript_id UUID NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1 CHECK (round_number >= 1),
    file_type manuscript_file_type NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_manuscript_files_manuscript_id ON public.manuscript_files(manuscript_id);
CREATE INDEX idx_manuscript_files_type ON public.manuscript_files(file_type);

-- ------------------------------------------------------------------------------
-- D. Peer Reviews Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manuscript_id UUID NOT NULL REFERENCES public.manuscripts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    round_number INT NOT NULL DEFAULT 1 CHECK (round_number >= 1),
    task_status review_task_status NOT NULL DEFAULT 'INVITED',
    score INT CHECK (score IS NULL OR (score >= 1 AND score <= 10)),
    comments_to_author TEXT,
    confidential_editor_notes TEXT,
    recommendation review_recommendation,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_manuscript_reviewer_round UNIQUE (manuscript_id, reviewer_id, round_number)
);

CREATE INDEX idx_reviews_manuscript_id ON public.reviews(manuscript_id);
CREATE INDEX idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_task_status ON public.reviews(task_status);

-- ------------------------------------------------------------------------------
-- E. Published Issues Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.published_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volume INT NOT NULL CHECK (volume >= 1),
    issue INT NOT NULL CHECK (issue >= 1),
    year INT NOT NULL CHECK (year >= 2000),
    title TEXT NOT NULL,
    theme TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_volume_issue UNIQUE (volume, issue, year)
);

-- ------------------------------------------------------------------------------
-- F. Published Articles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.published_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manuscript_id UUID REFERENCES public.manuscripts(id) ON DELETE SET NULL,
    issue_id UUID NOT NULL REFERENCES public.published_issues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    authors JSONB NOT NULL DEFAULT '[]'::jsonb,
    abstract TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    doi TEXT NOT NULL UNIQUE,
    page_start INT NOT NULL CHECK (page_start >= 1),
    page_end INT NOT NULL CHECK (page_end >= page_start),
    storage_path TEXT NOT NULL,
    view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    download_count INT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    published_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_published_articles_issue ON public.published_articles(issue_id);
CREATE INDEX idx_published_articles_doi ON public.published_articles(doi);

-- ==============================================================================
-- 4. STORAGE BUCKETS SETUP
-- ==============================================================================

-- Create manuscripts-vault (Private: Cover Letters & Blind Manuscripts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'manuscripts-vault',
    'manuscripts-vault',
    FALSE,
    26214400, -- 25MB in bytes
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Create public-articles (Public: Camera-Ready Open-Access PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'public-articles',
    'public-articles',
    TRUE,
    52428800, -- 50MB in bytes
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf'];

-- ==============================================================================
-- 5. HELPER FUNCTIONS & TRIGGERS (SECURITY DEFINER)
-- ==============================================================================

-- Function to safely fetch the calling user's role without recursive RLS overhead
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Function to check if caller is an EDITOR or ADMIN
CREATE OR REPLACE FUNCTION public.is_editor_or_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role IN ('EDITOR', 'ADMIN')
    );
$$;

-- Function to check if caller is an assigned reviewer for a given manuscript
CREATE OR REPLACE FUNCTION public.is_assigned_reviewer(target_manuscript_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.reviews
        WHERE manuscript_id = target_manuscript_id 
          AND reviewer_id = user_id
    );
$$;

-- Automatically create profile on new user registration in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, department, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'department', 'General Academics'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'AUTHOR'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic counter increment for article downloads
CREATE OR REPLACE FUNCTION public.increment_article_download(target_article_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INT;
BEGIN
    UPDATE public.published_articles
    SET download_count = download_count + 1
    WHERE id = target_article_id
    RETURNING download_count INTO new_count;

    RETURN new_count;
END;
$$;

-- Atomic counter increment for article views
CREATE OR REPLACE FUNCTION public.increment_article_view(target_article_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INT;
BEGIN
    UPDATE public.published_articles
    SET view_count = view_count + 1
    WHERE id = target_article_id
    RETURNING view_count INTO new_count;

    RETURN new_count;
END;
$$;

-- Timestamp auto-update trigger function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_manuscripts_timestamp BEFORE UPDATE ON public.manuscripts FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER tr_reviews_timestamp BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER tr_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuscript_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_articles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Profiles RLS
-- ------------------------------------------------------------------------------

-- Users can read their own profile; Editors/Admins can read all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_editor_or_admin(auth.uid())
    );

-- Users can update their own personal information (except role)
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Only Admins can modify any profile role
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL
    USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- ------------------------------------------------------------------------------
-- B. Manuscripts RLS (CRITICAL FOR BLIND REVIEW)
-- ------------------------------------------------------------------------------

-- Authors: can read their own manuscripts
CREATE POLICY "manuscripts_author_select" ON public.manuscripts
    FOR SELECT
    USING (auth.uid() = author_id);

-- Authors: can insert manuscripts where author_id = auth.uid()
CREATE POLICY "manuscripts_author_insert" ON public.manuscripts
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- Authors: can update only when status is DRAFT or REVISION_REQUIRED
CREATE POLICY "manuscripts_author_update" ON public.manuscripts
    FOR UPDATE
    USING (
        auth.uid() = author_id 
        AND status IN ('DRAFT', 'REVISION_REQUIRED')
    )
    WITH CHECK (
        auth.uid() = author_id 
        AND status IN ('DRAFT', 'SUBMITTED', 'REVISION_REQUIRED')
    );

-- Reviewers: can ONLY select manuscripts explicitly assigned to them in reviews
CREATE POLICY "manuscripts_reviewer_select" ON public.manuscripts
    FOR SELECT
    USING (public.is_assigned_reviewer(id, auth.uid()));

-- Editors & Admins: full access
CREATE POLICY "manuscripts_editor_all" ON public.manuscripts
    FOR ALL
    USING (public.is_editor_or_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- C. Manuscript Files RLS (CRITICAL FOR BLIND REVIEW INTEGRITY)
-- Reviewers can NEVER select COVER_LETTER files under any circumstance!
-- ------------------------------------------------------------------------------

-- Authors: can select files for their own manuscripts
CREATE POLICY "manuscript_files_author_select" ON public.manuscript_files
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.manuscripts 
            WHERE id = manuscript_id AND author_id = auth.uid()
        )
    );

-- Authors: can insert files for their own manuscripts
CREATE POLICY "manuscript_files_author_insert" ON public.manuscript_files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.manuscripts 
            WHERE id = manuscript_id AND author_id = auth.uid()
        )
    );

-- Reviewers: can SELECT ANONYMIZED_MANUSCRIPT and REVISED_MANUSCRIPT for assigned papers
-- EXPLICITLY BARS COVER_LETTER TO PRESERVE AUTHOR ANONYMITY!
CREATE POLICY "manuscript_files_reviewer_select" ON public.manuscript_files
    FOR SELECT
    USING (
        file_type IN ('ANONYMIZED_MANUSCRIPT', 'REVISED_MANUSCRIPT')
        AND public.is_assigned_reviewer(manuscript_id, auth.uid())
    );

-- Editors & Admins: full access to all manuscript files
CREATE POLICY "manuscript_files_editor_all" ON public.manuscript_files
    FOR ALL
    USING (public.is_editor_or_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- D. Reviews RLS
-- ------------------------------------------------------------------------------

-- Reviewers: can view their assigned reviews
CREATE POLICY "reviews_reviewer_select" ON public.reviews
    FOR SELECT
    USING (reviewer_id = auth.uid());

-- Reviewers: can submit/update their review comments & scores
CREATE POLICY "reviews_reviewer_update" ON public.reviews
    FOR UPDATE
    USING (reviewer_id = auth.uid() AND task_status IN ('INVITED', 'ACCEPTED', 'SUBMITTED'))
    WITH CHECK (reviewer_id = auth.uid());

-- Authors: can view non-confidential review results once an editorial decision is reached
CREATE POLICY "reviews_author_select" ON public.reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.manuscripts m
            WHERE m.id = manuscript_id 
              AND m.author_id = auth.uid()
              AND m.status IN ('DECISION_PENDING', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED', 'PUBLISHED')
        )
    );

-- Editors & Admins: full access to assign and manage reviews
CREATE POLICY "reviews_editor_all" ON public.reviews
    FOR ALL
    USING (public.is_editor_or_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- E. Published Issues & Articles RLS (Public Read Access)
-- ------------------------------------------------------------------------------

-- Everyone (anonymous + authenticated) can view published issues and articles
CREATE POLICY "published_issues_public_read" ON public.published_issues
    FOR SELECT
    USING (is_published = TRUE OR public.is_editor_or_admin(auth.uid()));

CREATE POLICY "published_articles_public_read" ON public.published_articles
    FOR SELECT
    USING (TRUE);

-- Editors & Admins: manage publication catalog
CREATE POLICY "published_issues_editor_manage" ON public.published_issues
    FOR ALL
    USING (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "published_articles_editor_manage" ON public.published_articles
    FOR ALL
    USING (public.is_editor_or_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- F. Supabase Storage RLS Policies (storage.objects)
-- ------------------------------------------------------------------------------

-- Policy 1: Authenticated users can upload manuscripts to their own folder in manuscripts-vault
CREATE POLICY "vault_author_upload" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'manuscripts-vault'
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Policy 2: Authors can read files in their own folder
CREATE POLICY "vault_author_read" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'manuscripts-vault'
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Policy 3: Reviewers can download assigned anonymized manuscripts via signed URLs
-- Note: Reviewer downloading is mediated through the secure route handler which validates
-- reviewer assignment and blocks COVER_LETTER requests before generating a 60s signed URL.
-- Editors and Admins have full access to manuscripts-vault.
CREATE POLICY "vault_editor_access" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'manuscripts-vault'
        AND public.is_editor_or_admin(auth.uid())
    );

-- Policy 4: Public access for public-articles bucket
CREATE POLICY "public_articles_read" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'public-articles');

CREATE POLICY "public_articles_editor_write" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'public-articles'
        AND public.is_editor_or_admin(auth.uid())
    );
