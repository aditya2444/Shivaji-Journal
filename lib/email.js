// ==============================================================================
// Resend Email Dispatch Service (Pure JavaScript)
// Handles automated transactional notifications for authors, reviewers, and editors
// ==============================================================================

import { Resend } from 'resend';

// Initialize Resend client lazily to avoid runtime exceptions if key is missing during build
let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[Resend] Warning: RESEND_API_KEY is not configured. Emails will be logged to console.');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'Shivraj 350 Journal <shivraj350@shivaji.du.ac.in>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * 1. Dispatches an official submission acknowledgment email to the author.
 */
export async function sendSubmissionAcknowledgment({ to, authorName, trackingId, title }) {
  const client = getResendClient();
  const subject = `[Shivraj Journal] Manuscript Submission Acknowledgment: ${trackingId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px;">
        <div style="border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0b0f19; margin: 0; font-family: Georgia, serif;">Shivraj 350: Multidisciplinary Journal</h2>
          <p style="color: #881337; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Shivaji College • University of Delhi</p>
        </div>
        
        <p>Dear <strong>${authorName}</strong>,</p>
        <p>Thank you for submitting your manuscript for peer review and publication in <em>Shivraj: International Peer-Reviewed Multidisciplinary Journal</em>.</p>
        
        <div style="background-color: #f1f5f9; border-left: 4px solid #d4af37; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Manuscript Tracking ID:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${trackingId}</code></p>
          <p style="margin: 0; font-size: 14px;"><strong>Title:</strong> "${title}"</p>
        </div>
        
        <p>Your submission has successfully entered the initial editorial screening phase. You will receive updates as the double-blind peer review progresses.</p>
        
        <p style="margin-top: 24px;">
          <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #881337; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px;">
            Track Manuscript Status
          </a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Editorial Office • Shivaji College, University of Delhi<br/>
          Ring Road, Raja Garden, New Delhi – 110027, India<br/>
          Email: shivraj350@shivaji.du.ac.in | Web: www.shivajicollege.ac.in
        </p>
      </div>
    </body>
    </html>
  `;

  if (!client) {
    console.log(`[Email Mock] Submission Acknowledgment to: ${to} | Tracking: ${trackingId}`);
    return { success: true, mocked: true };
  }

  try {
    const response = await client.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('[Resend Error] Failed to send submission acknowledgment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Invites an assigned peer reviewer with double-blind details (no author identity).
 */
export async function sendReviewerInvitation({ to, reviewerName, manuscriptTitle, abstract, trackingId, reviewId }) {
  const client = getResendClient();
  const subject = `[Shivraj Journal] Peer Review Invitation: ${trackingId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px;">
        <div style="border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0b0f19; margin: 0; font-family: Georgia, serif;">Shivraj 350: Multidisciplinary Journal</h2>
          <p style="color: #881337; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Peer Review Assignment</p>
        </div>
        
        <p>Dear <strong>${reviewerName}</strong>,</p>
        <p>You have been nominated by the Editorial Board to review the following manuscript under our <strong>Double-Blind Peer Review</strong> policy:</p>
        
        <div style="background-color: #f1f5f9; border-left: 4px solid #881337; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Manuscript ID:</strong> <code>${trackingId}</code></p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Title:</strong> "${manuscriptTitle}"</p>
          <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Abstract:</strong> ${abstract}</p>
        </div>
        
        <p>Author identities have been strictly anonymized to preserve peer-review integrity. Please log in to review the paper and submit your evaluation within <strong>3 weeks</strong>.</p>
        
        <p style="margin-top: 24px;">
          <a href="${APP_URL}/reviewer/${reviewId}" style="display: inline-block; background-color: #881337; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px;">
            Accept & View Anonymized Paper
          </a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Editorial Office • Shivaji College, University of Delhi
        </p>
      </div>
    </body>
    </html>
  `;

  if (!client) {
    console.log(`[Email Mock] Reviewer Invitation to: ${to} | Review ID: ${reviewId}`);
    return { success: true, mocked: true };
  }

  try {
    const response = await client.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('[Resend Error] Failed to send reviewer invitation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Notifies author of the official editorial decision (Accept / Revision / Reject).
 */
export async function sendEditorialDecisionNotification({ to, authorName, title, trackingId, decision, editorNotes, scorecards }) {
  const client = getResendClient();
  const subject = `[Shivraj Journal] Editorial Decision on Manuscript: ${trackingId}`;

  const decisionBadgeColor = 
    decision === 'ACCEPTED' ? '#10b981' :
    decision === 'REVISION_REQUIRED' ? '#f59e0b' : '#ef4444';

  const reviewsHtml = (scorecards || []).map((review, index) => `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
      <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Reviewer ${index + 1} Recommendation: <strong>${review.recommendation || 'Evaluated'}</strong></h4>
      <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${review.comments_to_author || 'No specific comments provided.'}</p>
    </div>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px;">
        <div style="border-bottom: 2px solid #d4af37; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #0b0f19; margin: 0; font-family: Georgia, serif;">Shivraj 350: Multidisciplinary Journal</h2>
          <p style="color: #881337; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Official Editorial Decision</p>
        </div>
        
        <p>Dear <strong>${authorName}</strong>,</p>
        <p>The Editorial Board has completed the peer review assessment for your manuscript: <strong>"${title}"</strong> (ID: <code>${trackingId}</code>).</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background-color: ${decisionBadgeColor}; color: #ffffff; padding: 8px 24px; border-radius: 20px; font-weight: bold; font-size: 16px; letter-spacing: 0.05em;">
            ${decision.replace('_', ' ')}
          </span>
        </div>
        
        ${editorNotes ? `
          <div style="background-color: #f1f5f9; border-left: 4px solid #881337; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #0b0f19;">Editorial Comments & Next Steps:</p>
            <p style="margin: 0; font-size: 14px; color: #334155; white-space: pre-wrap;">${editorNotes}</p>
          </div>
        ` : ''}

        <h3 style="color: #0f172a; margin: 24px 0 12px 0; font-size: 16px;">Peer Review Evaluations:</h3>
        ${reviewsHtml || '<p style="font-size: 13px; color: #64748b;">No external reviewer comments attached.</p>'}
        
        <p style="margin-top: 24px;">
          <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #881337; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 14px;">
            Open Author Dashboard
          </a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          Editorial Office • Shivaji College, University of Delhi
        </p>
      </div>
    </body>
    </html>
  `;

  if (!client) {
    console.log(`[Email Mock] Decision Notification to: ${to} | Decision: ${decision}`);
    return { success: true, mocked: true };
  }

  try {
    const response = await client.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('[Resend Error] Failed to send decision notification:', error);
    return { success: false, error: error.message };
  }
}
