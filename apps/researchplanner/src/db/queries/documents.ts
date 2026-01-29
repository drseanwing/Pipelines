/**
 * Documents database queries
 * Phase 2.16 - Database Queries - Documents
 */

import { getPool } from '../client.js';
import type { GeneratedDocument, DocumentStatus } from '../../types/index.js';

/**
 * Create a new document record
 * @param doc - Document data (without id which is auto-generated)
 * @returns Promise resolving to the created document
 */
export async function createDocumentRecord(
  doc: Omit<GeneratedDocument, 'id'>
): Promise<GeneratedDocument> {
  const pool = getPool();

  const query = `
    INSERT INTO documents (
      project_id,
      document_type,
      filename,
      file_path,
      file_size,
      mime_type,
      version,
      status,
      metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, project_id, document_type, filename, file_path,
              file_size, mime_type, version, status, created_at, metadata
  `;

  const values = [
    doc.project_id,
    doc.document_type,
    doc.filename,
    doc.file_path,
    doc.file_size || null,
    doc.mime_type || null,
    doc.version,
    doc.status,
    doc.metadata ? JSON.stringify(doc.metadata) : null,
  ];

  try {
    const result = await pool.query(query, values);
    return mapRowToDocument(result.rows[0]);
  } catch (error) {
    console.error('Error creating document record:', error);
    throw new Error(`Failed to create document record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all documents for a specific project
 * @param projectId - Project UUID
 * @returns Promise resolving to array of documents
 */
export async function getDocumentsByProject(projectId: string): Promise<GeneratedDocument[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, document_type, filename, file_path,
           file_size, mime_type, version, status, created_at, metadata
    FROM documents
    WHERE project_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [projectId]);
    return result.rows.map(mapRowToDocument);
  } catch (error) {
    console.error('Error fetching documents by project:', error);
    throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update document status
 * @param id - Document UUID
 * @param status - New document status
 */
export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus
): Promise<void> {
  const pool = getPool();

  const query = `
    UPDATE documents
    SET status = $1
    WHERE id = $2
  `;

  try {
    const result = await pool.query(query, [status, id]);
    if (result.rowCount === 0) {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error updating document status:', error);
    throw new Error(`Failed to update document status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a single document by ID
 * @param id - Document UUID
 * @returns Promise resolving to the document or null if not found
 */
export async function getDocumentById(id: string): Promise<GeneratedDocument | null> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, document_type, filename, file_path,
           file_size, mime_type, version, status, created_at, metadata
    FROM documents
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToDocument(result.rows[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update document metadata
 * @param id - Document UUID
 * @param metadata - New metadata object
 */
export async function updateDocumentMetadata(
  id: string,
  metadata: Record<string, any>
): Promise<void> {
  const pool = getPool();

  const query = `
    UPDATE documents
    SET metadata = $1
    WHERE id = $2
  `;

  try {
    const result = await pool.query(query, [JSON.stringify(metadata), id]);
    if (result.rowCount === 0) {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error updating document metadata:', error);
    throw new Error(`Failed to update document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a document record
 * @param id - Document UUID
 */
export async function deleteDocument(id: string): Promise<void> {
  const pool = getPool();

  const query = `
    DELETE FROM documents
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get documents by type for a project
 * @param projectId - Project UUID
 * @param documentType - Type of document to filter by
 * @returns Promise resolving to array of documents
 */
export async function getDocumentsByType(
  projectId: string,
  documentType: string
): Promise<GeneratedDocument[]> {
  const pool = getPool();

  const query = `
    SELECT id, project_id, document_type, filename, file_path,
           file_size, mime_type, version, status, created_at, metadata
    FROM documents
    WHERE project_id = $1 AND document_type = $2
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [projectId, documentType]);
    return result.rows.map(mapRowToDocument);
  } catch (error) {
    console.error('Error fetching documents by type:', error);
    throw new Error(`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map database row to GeneratedDocument type
 * @param row - Database row
 * @returns GeneratedDocument object
 */
function mapRowToDocument(row: any): GeneratedDocument {
  return {
    id: row.id,
    project_id: row.project_id,
    document_type: row.document_type,
    filename: row.filename,
    file_path: row.file_path,
    file_size: row.file_size || undefined,
    mime_type: row.mime_type || undefined,
    version: row.version,
    status: row.status,
    created_at: row.created_at.toISOString(),
    metadata: row.metadata || undefined,
  };
}
