-- ============================================================================
-- QI Research Pipeline - Database Functions and Triggers
-- Migration: 002_create_functions.sql
-- Description: Creates helper functions and triggers for automated data
--              management including timestamp updates and audit logging
-- ============================================================================

-- ============================================================================
-- UPDATE_TIMESTAMP() TRIGGER FUNCTION
-- ============================================================================
-- Purpose: Automatically updates the 'updated_at' column to the current
-- timestamp whenever a row is modified. This ensures accurate tracking of
-- when records were last changed without requiring application-level logic.
--
-- Usage: Attach this trigger to any table with an 'updated_at' column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Set the updated_at column to the current timestamp
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_timestamp() IS 'Trigger function to automatically update the updated_at timestamp on row modification';

-- ============================================================================
-- AUDIT_LOG_TRIGGER() FUNCTION
-- ============================================================================
-- Purpose: Automatically creates audit log entries when projects are modified.
-- Captures the action type (INSERT, UPDATE, DELETE), the actor (from session
-- variable if set), and snapshots of the previous and new states.
--
-- This provides a complete audit trail for compliance and debugging without
-- requiring application code to explicitly log each change.
--
-- Session variables used:
--   - app.current_user: The ID or email of the user making the change
--   - app.client_ip: The IP address of the client (optional)
--   - app.session_id: The session identifier (optional)
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    action_name VARCHAR(100);
    actor_id VARCHAR(255);
    client_ip INET;
    session_id VARCHAR(255);
    old_state JSONB;
    new_state JSONB;
    change_details JSONB;
BEGIN
    -- Determine the action type based on the trigger operation
    CASE TG_OP
        WHEN 'INSERT' THEN
            action_name := 'PROJECT_CREATED';
            old_state := NULL;
            new_state := to_jsonb(NEW);
            change_details := jsonb_build_object(
                'operation', 'INSERT',
                'table', TG_TABLE_NAME
            );
        WHEN 'UPDATE' THEN
            -- Determine more specific action based on what changed
            IF OLD.status != NEW.status THEN
                action_name := 'STATUS_CHANGED';
                change_details := jsonb_build_object(
                    'operation', 'UPDATE',
                    'table', TG_TABLE_NAME,
                    'previous_status', OLD.status,
                    'new_status', NEW.status
                );
            ELSIF OLD.checkpoints IS DISTINCT FROM NEW.checkpoints THEN
                action_name := 'CHECKPOINT_UPDATED';
                change_details := jsonb_build_object(
                    'operation', 'UPDATE',
                    'table', TG_TABLE_NAME,
                    'checkpoint_change', TRUE
                );
            ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                action_name := 'PROJECT_ARCHIVED';
                change_details := jsonb_build_object(
                    'operation', 'SOFT_DELETE',
                    'table', TG_TABLE_NAME
                );
            ELSE
                action_name := 'PROJECT_UPDATED';
                change_details := jsonb_build_object(
                    'operation', 'UPDATE',
                    'table', TG_TABLE_NAME,
                    'fields_changed', (
                        SELECT jsonb_agg(key)
                        FROM jsonb_each(to_jsonb(NEW))
                        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
                    )
                );
            END IF;
            old_state := to_jsonb(OLD);
            new_state := to_jsonb(NEW);
        WHEN 'DELETE' THEN
            action_name := 'PROJECT_DELETED';
            old_state := to_jsonb(OLD);
            new_state := NULL;
            change_details := jsonb_build_object(
                'operation', 'DELETE',
                'table', TG_TABLE_NAME
            );
    END CASE;

    -- Retrieve session variables (set by application layer)
    -- These are optional and will default to 'SYSTEM' if not set
    BEGIN
        actor_id := current_setting('app.current_user', TRUE);
    EXCEPTION WHEN OTHERS THEN
        actor_id := NULL;
    END;

    BEGIN
        client_ip := current_setting('app.client_ip', TRUE)::INET;
    EXCEPTION WHEN OTHERS THEN
        client_ip := NULL;
    END;

    BEGIN
        session_id := current_setting('app.session_id', TRUE);
    EXCEPTION WHEN OTHERS THEN
        session_id := NULL;
    END;

    -- Default actor to 'SYSTEM' if not provided
    IF actor_id IS NULL OR actor_id = '' THEN
        actor_id := 'SYSTEM';
    END IF;

    -- Insert the audit log entry
    INSERT INTO audit_log (
        project_id,
        timestamp,
        action,
        actor,
        details,
        previous_state,
        new_state,
        ip_address,
        session_id
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        CURRENT_TIMESTAMP,
        action_name,
        actor_id,
        change_details,
        old_state,
        new_state,
        client_ip,
        session_id
    );

    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_log_trigger() IS 'Trigger function to automatically create audit log entries for project changes';

-- ============================================================================
-- HELPER FUNCTION: SET_SESSION_CONTEXT()
-- ============================================================================
-- Purpose: Convenience function for applications to set session context
-- variables used by the audit logging trigger. Call this at the beginning
-- of each database transaction/session.
--
-- Parameters:
--   - p_user_id: The ID or email of the current user
--   - p_client_ip: The client's IP address (optional)
--   - p_session_id: The session identifier (optional)
-- ============================================================================
CREATE OR REPLACE FUNCTION set_session_context(
    p_user_id VARCHAR(255),
    p_client_ip VARCHAR(45) DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Set the current user for audit logging
    PERFORM set_config('app.current_user', p_user_id, TRUE);

    -- Set optional context variables if provided
    IF p_client_ip IS NOT NULL THEN
        PERFORM set_config('app.client_ip', p_client_ip, TRUE);
    END IF;

    IF p_session_id IS NOT NULL THEN
        PERFORM set_config('app.session_id', p_session_id, TRUE);
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_session_context(VARCHAR, VARCHAR, VARCHAR) IS 'Sets session context variables for audit logging (user, IP, session)';

-- ============================================================================
-- HELPER FUNCTION: GET_PROJECT_AUDIT_HISTORY()
-- ============================================================================
-- Purpose: Retrieves the complete audit history for a specific project,
-- ordered by timestamp (most recent first). Useful for displaying project
-- activity timelines in the UI.
--
-- Parameters:
--   - p_project_id: The UUID of the project
--   - p_limit: Maximum number of records to return (default 100)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_project_audit_history(
    p_project_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    timestamp TIMESTAMP WITH TIME ZONE,
    action VARCHAR(100),
    actor VARCHAR(255),
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.timestamp,
        al.action,
        al.actor,
        al.details
    FROM audit_log al
    WHERE al.project_id = p_project_id
    ORDER BY al.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_audit_history(UUID, INTEGER) IS 'Retrieves audit history for a project, ordered by most recent first';

-- ============================================================================
-- HELPER FUNCTION: ADVANCE_PROJECT_STATUS()
-- ============================================================================
-- Purpose: Safely advances a project to the next status in the pipeline
-- workflow. Validates that the status transition is allowed before updating.
--
-- Parameters:
--   - p_project_id: The UUID of the project
--   - p_new_status: The target status
--
-- Returns: TRUE if status was updated, FALSE if transition is not allowed
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_project_status(
    p_project_id UUID,
    p_new_status VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status VARCHAR(50);
    allowed_transitions JSONB;
BEGIN
    -- Define allowed status transitions
    allowed_transitions := '{
        "DRAFT": ["INTAKE_COMPLETE"],
        "INTAKE_COMPLETE": ["INTAKE_APPROVED", "DRAFT"],
        "INTAKE_APPROVED": ["RESEARCH_COMPLETE"],
        "RESEARCH_COMPLETE": ["RESEARCH_APPROVED", "INTAKE_APPROVED"],
        "RESEARCH_APPROVED": ["METHODOLOGY_COMPLETE"],
        "METHODOLOGY_COMPLETE": ["METHODOLOGY_APPROVED", "RESEARCH_APPROVED"],
        "METHODOLOGY_APPROVED": ["ETHICS_COMPLETE"],
        "ETHICS_COMPLETE": ["ETHICS_APPROVED", "METHODOLOGY_APPROVED"],
        "ETHICS_APPROVED": ["DOCUMENTS_COMPLETE"],
        "DOCUMENTS_COMPLETE": ["DOCUMENTS_APPROVED", "ETHICS_APPROVED"],
        "DOCUMENTS_APPROVED": ["SUBMITTED"],
        "SUBMITTED": ["REVISION_REQUIRED", "COMPLETED"],
        "REVISION_REQUIRED": ["SUBMITTED", "DOCUMENTS_COMPLETE"],
        "COMPLETED": ["ARCHIVED"],
        "ARCHIVED": []
    }'::JSONB;

    -- Get current status
    SELECT status INTO current_status
    FROM projects
    WHERE id = p_project_id;

    -- Check if project exists
    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Project not found: %', p_project_id;
    END IF;

    -- Check if transition is allowed
    IF NOT (allowed_transitions -> current_status) ? p_new_status THEN
        RETURN FALSE;
    END IF;

    -- Update the status
    UPDATE projects
    SET status = p_new_status
    WHERE id = p_project_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION advance_project_status(UUID, VARCHAR) IS 'Safely advances project status with transition validation';

-- ============================================================================
-- HELPER FUNCTION: CALCULATE_PROJECT_PROGRESS()
-- ============================================================================
-- Purpose: Calculates the completion percentage of a project based on
-- which pipeline stages have been completed (approved).
--
-- Parameters:
--   - p_project_id: The UUID of the project
--
-- Returns: Integer percentage (0-100)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    project_checkpoints JSONB;
    completed_count INTEGER := 0;
    total_stages INTEGER := 5;
BEGIN
    -- Get checkpoints for the project
    SELECT checkpoints INTO project_checkpoints
    FROM projects
    WHERE id = p_project_id;

    -- Count completed checkpoints
    IF project_checkpoints IS NOT NULL THEN
        IF (project_checkpoints->>'intake_approved')::BOOLEAN = TRUE THEN
            completed_count := completed_count + 1;
        END IF;
        IF (project_checkpoints->>'research_approved')::BOOLEAN = TRUE THEN
            completed_count := completed_count + 1;
        END IF;
        IF (project_checkpoints->>'methodology_approved')::BOOLEAN = TRUE THEN
            completed_count := completed_count + 1;
        END IF;
        IF (project_checkpoints->>'ethics_approved')::BOOLEAN = TRUE THEN
            completed_count := completed_count + 1;
        END IF;
        IF (project_checkpoints->>'documents_approved')::BOOLEAN = TRUE THEN
            completed_count := completed_count + 1;
        END IF;
    END IF;

    RETURN (completed_count * 100) / total_stages;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_project_progress(UUID) IS 'Calculates project completion percentage based on approved checkpoints';

-- ============================================================================
-- ATTACH TRIGGERS TO TABLES
-- ============================================================================

-- Attach update_timestamp trigger to projects table
DROP TRIGGER IF EXISTS projects_update_timestamp ON projects;
CREATE TRIGGER projects_update_timestamp
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Attach update_timestamp trigger to users table
DROP TRIGGER IF EXISTS users_update_timestamp ON users;
CREATE TRIGGER users_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Attach audit_log_trigger to projects table
DROP TRIGGER IF EXISTS projects_audit_log ON projects;
CREATE TRIGGER projects_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

-- ============================================================================
-- DOCUMENT AUDIT TRIGGER
-- ============================================================================
-- Purpose: Logs document-related changes to the audit log
-- ============================================================================
CREATE OR REPLACE FUNCTION document_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    action_name VARCHAR(100);
    actor_id VARCHAR(255);
BEGIN
    -- Determine action
    CASE TG_OP
        WHEN 'INSERT' THEN action_name := 'DOCUMENT_CREATED';
        WHEN 'UPDATE' THEN
            IF OLD.status != NEW.status THEN
                action_name := 'DOCUMENT_STATUS_CHANGED';
            ELSE
                action_name := 'DOCUMENT_UPDATED';
            END IF;
        WHEN 'DELETE' THEN action_name := 'DOCUMENT_DELETED';
    END CASE;

    -- Get current user from session
    BEGIN
        actor_id := current_setting('app.current_user', TRUE);
    EXCEPTION WHEN OTHERS THEN
        actor_id := 'SYSTEM';
    END;

    IF actor_id IS NULL OR actor_id = '' THEN
        actor_id := 'SYSTEM';
    END IF;

    -- Log to audit_log
    INSERT INTO audit_log (
        project_id,
        action,
        actor,
        details
    ) VALUES (
        COALESCE(NEW.project_id, OLD.project_id),
        action_name,
        actor_id,
        jsonb_build_object(
            'document_id', COALESCE(NEW.id, OLD.id),
            'document_type', COALESCE(NEW.document_type, OLD.document_type),
            'filename', COALESCE(NEW.filename, OLD.filename),
            'status', COALESCE(NEW.status, OLD.status)
        )
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION document_audit_trigger() IS 'Trigger function to audit document changes';

-- Attach document audit trigger
DROP TRIGGER IF EXISTS documents_audit_log ON documents;
CREATE TRIGGER documents_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION document_audit_trigger();

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
