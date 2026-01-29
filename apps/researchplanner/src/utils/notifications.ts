/**
 * Notification Utilities
 * Phase 3.6 - Email notifications for checkpoints
 */

import type { Project } from '../types/index.js';

/**
 * Notification type enum for different checkpoint events
 */
export enum NotificationType {
  INTAKE_COMPLETE = 'INTAKE_COMPLETE',
  RESEARCH_COMPLETE = 'RESEARCH_COMPLETE',
  METHODOLOGY_COMPLETE = 'METHODOLOGY_COMPLETE',
  ETHICS_COMPLETE = 'ETHICS_COMPLETE',
  DOCUMENTS_COMPLETE = 'DOCUMENTS_COMPLETE',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  SUBMISSION_READY = 'SUBMISSION_READY',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
}

/**
 * Email templates for each notification type
 */
const EMAIL_TEMPLATES: Record<NotificationType, { subject: string; bodyTemplate: (project: Project) => string }> = {
  [NotificationType.INTAKE_COMPLETE]: {
    subject: 'Project Intake Complete - Review Required',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

Your project intake for "${project.intake.project_title}" has been completed and is ready for review.

Project ID: ${project.id}
Project Type: ${project.classification.project_type}
Confidence: ${(project.classification.confidence * 100).toFixed(1)}%

Please review the project classification and framework recommendations.

[Review Project]

If you have any questions, please contact the research support team.

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.RESEARCH_COMPLETE]: {
    subject: 'Literature Review Complete - Review Required',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

The literature review for "${project.intake.project_title}" has been completed.

Project ID: ${project.id}
Primary Articles: ${project.research?.primary_literature?.length || 0}
Secondary Articles: ${project.research?.secondary_literature?.length || 0}

Please review the evidence synthesis and gap analysis.

[Review Literature]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.METHODOLOGY_COMPLETE]: {
    subject: 'Methodology Design Complete - Review Required',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

The methodology design for "${project.intake.project_title}" has been completed.

Project ID: ${project.id}
Study Design: ${project.methodology?.study_design?.design_type || 'N/A'}

Please review the study design, participant criteria, and analysis plan.

[Review Methodology]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.ETHICS_COMPLETE]: {
    subject: 'Ethics Evaluation Complete - Review Required',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

The ethics evaluation for "${project.intake.project_title}" has been completed.

Project ID: ${project.id}
Ethics Pathway: ${project.ethics?.pathway?.pathway_type || 'N/A'}
Approval Body: ${project.ethics?.pathway?.approval_body || 'N/A'}

Please review the ethics pathway determination and governance requirements.

[Review Ethics]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.DOCUMENTS_COMPLETE]: {
    subject: 'Documents Generated - Final Review',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

All documents for "${project.intake.project_title}" have been generated and are ready for final review.

Project ID: ${project.id}
Documents Generated: ${project.documents?.generated_documents?.length || 0}

Please review all documents before submission.

[Download Documents]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.REVISION_REQUIRED]: {
    subject: 'Revisions Required for Project',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

Revisions have been requested for "${project.intake.project_title}".

Project ID: ${project.id}
Current Status: ${project.status}

Please review the feedback and make necessary revisions.

[View Feedback]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.SUBMISSION_READY]: {
    subject: 'Project Ready for Submission',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

Your project "${project.intake.project_title}" is ready for submission.

Project ID: ${project.id}

All documents have been approved and are available for download.

[Download Submission Package]

Best regards,
QI/Research Pipeline System
    `.trim(),
  },

  [NotificationType.ERROR_OCCURRED]: {
    subject: 'Error Processing Project',
    bodyTemplate: (project: Project) => `
Dear ${project.intake.principal_investigator.name},

An error occurred while processing "${project.intake.project_title}".

Project ID: ${project.id}

The support team has been notified and will investigate the issue.

Best regards,
QI/Research Pipeline System
    `.trim(),
  },
};

/**
 * Send an email (stub implementation - requires SMTP configuration)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text or HTML)
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // TODO: Implement actual SMTP email sending
  // This is a stub that would be replaced with actual email service integration
  // Options: nodemailer, SendGrid, AWS SES, etc.

  console.log('Email would be sent:');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);

  // In production, this would use nodemailer or similar:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({ from, to, subject, text: body });
}

/**
 * Notify user about a project checkpoint or event
 * @param projectId - The project UUID
 * @param type - The notification type
 * @param recipientEmail - The recipient's email address
 */
export async function notifyUser(
  projectId: string,
  type: NotificationType,
  recipientEmail: string
): Promise<void> {
  // In a full implementation, this would fetch the project from the database
  // For now, we'll assume the project is passed or fetched elsewhere

  const template = EMAIL_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  // Note: In actual implementation, fetch project here
  // const project = await getProjectById(projectId);
  // const body = formatNotificationBody(type, project);
  // await sendEmail(recipientEmail, template.subject, body);

  console.log(`Notification ${type} would be sent to ${recipientEmail} for project ${projectId}`);
}

/**
 * Format the notification body for a specific type and project
 * @param type - The notification type
 * @param project - The project data
 * @returns Formatted email body
 */
export function formatNotificationBody(
  type: NotificationType,
  project: Project
): string {
  const template = EMAIL_TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  return template.bodyTemplate(project);
}
