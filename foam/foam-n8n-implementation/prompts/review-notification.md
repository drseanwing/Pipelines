# Review Request Notification Generator

## Purpose
Generate professional, actionable review request notifications for expert clinical reviewers on behalf of the **Resuscitation EDucation Initiative (REdI)**, Metro North Health. This prompt creates targeted communications (email, Slack, system notifications) that clearly outline what needs to be reviewed, why expert input is critical, and how to complete the review efficiently.

## Brand Styling

All notifications must follow REdI brand guidelines. Reference `config/redi-theme.json` for design tokens.

### Colour Palette for Notifications
- **Primary action buttons:** REdI Coral `#E55B64` (hover: `#D14A53`), REdI Navy `#1B3A5F` text (to meet WCAG 2.1 AA on light backgrounds)
- **Secondary buttons:** REdI Navy `#1B3A5F`, white text
- **Outline buttons:** REdI Coral border and text on white
- **HIGH urgency badge:** Alert Red `#DC3545`
- **MEDIUM urgency badge:** Warning Amber `#FFC107`
- **LOW urgency badge:** Info Blue `#17A2B8`
- **Links:** REdI Navy `#1B3A5F` on light backgrounds (Sky Blue `#5DADE2` may be used for hover/underline accents where contrast remains acceptable)
- **Headers:** REdI Navy `#1B3A5F`
- **Body text:** Dark Gray `#333333`
- **Backgrounds:** Light Gray `#F5F5F5` or White `#FFFFFF`

### Typography for HTML Emails
- **Font family:** Montserrat, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif
- **H1:** 2rem, weight 700, REdI Navy
- **H2:** 1.5rem, weight 600, REdI Navy
- **Body:** 1rem, weight 400, line-height 1.6, Dark Gray
- **Button text:** weight 600

### Email Header Template
Include the REdI wordmark and a gradient accent bar (Lime `#B8CC26` to Teal `#2B9E9E` to Navy `#1B3A5F`) at the top of HTML emails.

### Email Footer Template
Include: "Resuscitation EDucation Initiative (REdI) | Metro North Health | Queensland Government" with REdI Teal `#2B9E9E` divider line.

## Input Requirements

You will receive:

### 1. Draft Content Metadata
```json
{
  "draft_id": "uuid-v4",
  "title": "Clinical topic title",
  "format": "clinical-review|case-discussion|guideline|educational-module",
  "topic": "Clinical specialty area",
  "word_count": 2500,
  "sections": ["Section 1", "Section 2"],
  "target_audience": "EM physicians|ICU nurses|paramedics|etc",
  "content_status": "draft|in-review|revision",
  "draft_version": "1.0",
  "last_updated": "ISO 8601 timestamp"
}
```

### 2. Validation Findings Summary
```json
{
  "total_items_requiring_verification": 45,
  "breakdown": {
    "high_priority_doses": 8,
    "medium_priority_doses": 12,
    "clinical_thresholds": 10,
    "statistical_claims": 7,
    "guideline_checks": 5,
    "uncited_items": 3
  },
  "critical_safety_flags": [
    "Narrow therapeutic index drug dosing",
    "Time-critical interventions",
    "Paediatric dosing calculations"
  ],
  "conflicting_guidelines_noted": 2,
  "missing_citations": 8
}
```

### 3. Clinical Pearls Needed
```json
{
  "total_pearls_requested": 6,
  "high_priority": 2,
  "medium_priority": 3,
  "low_priority": 1,
  "topics": [
    "Practical administration technique for drug X",
    "Atypical presentations in elderly patients",
    "Common pitfall in diagnosis"
  ]
}
```

### 4. Reviewer Checklist Summary
```json
{
  "checklist_id": "uuid-v4",
  "estimated_review_time": "45 minutes",
  "time_breakdown": {
    "clinical_accuracy": "20 min",
    "clinical_pearls": "15 min",
    "completeness": "10 min"
  },
  "sections": [
    "Clinical Accuracy Verification",
    "Clinical Pearls",
    "Regional Considerations",
    "Special Populations",
    "Content Completeness"
  ]
}
```

### 5. Reviewer Information
```json
{
  "reviewer_name": "Dr. Jane Smith",
  "reviewer_email": "jane.smith@hospital.edu",
  "reviewer_specialty": "Emergency Medicine",
  "reviewer_credentials": "MBBS, FACEM",
  "reviewer_role": "Attending Physician",
  "institution": "City General Hospital",
  "timezone": "UTC+10",
  "preferred_contact": "email|slack|both"
}
```

### 6. Review Logistics
```json
{
  "review_due_date": "ISO 8601 date",
  "review_url": "https://system.url/review/uuid",
  "review_platform": "web-interface|json-file|google-docs",
  "content_creator_name": "Dr. John Doe",
  "content_creator_contact": "john.doe@foam.edu",
  "urgency": "high|medium|low",
  "project_deadline": "ISO 8601 date",
  "compensation": "Voluntary|CME credits|Honorarium",
  "follow_up_process": "Description of next steps after review"
}
```

## Task

Generate professional review request notifications in multiple formats optimized for different communication channels.

## Output Format

Return as JSON with these components:

```json
{
  "notification_metadata": {
    "notification_id": "uuid-v4",
    "draft_id": "uuid-v4",
    "reviewer_id": "Reviewer identifier",
    "generated_at": "ISO 8601 timestamp",
    "expires_at": "ISO 8601 timestamp",
    "urgency_level": "HIGH|MEDIUM|LOW",
    "estimated_review_time": "45 minutes"
  },

  "email_notification": {
    "subject": "Email subject line",
    "body_markdown": "Full email body in markdown format",
    "body_html": "HTML version of email body",
    "attachments": [
      {
        "type": "pdf|json|docx",
        "filename": "checklist.json",
        "description": "Reviewer checklist in JSON format"
      }
    ],
    "cc_addresses": ["content.creator@foam.edu"],
    "reply_to": "content.creator@foam.edu",
    "priority": "high|normal|low"
  },

  "slack_notification": {
    "channel": "#clinical-review|@reviewer-username",
    "message": "Slack message with markdown formatting",
    "blocks": [
      {
        "type": "section|actions|divider",
        "text": "Block content",
        "accessory": {
          "type": "button",
          "text": "Start Review",
          "url": "https://review.url",
          "style": "primary"
        }
      }
    ],
    "thread_ts": null,
    "unfurl_links": false
  },

  "web_dashboard_card": {
    "title": "Review Request: [Topic]",
    "summary": "Brief summary for dashboard",
    "priority_badge": "HIGH|MEDIUM|LOW",
    "time_estimate": "45 min",
    "due_date_display": "Due: Jan 25, 2026",
    "action_buttons": [
      {
        "label": "Start Review",
        "url": "https://review.url",
        "style": "primary"
      },
      {
        "label": "View Draft",
        "url": "https://draft.url",
        "style": "secondary"
      }
    ],
    "stats": {
      "items_to_verify": 45,
      "pearls_needed": 6,
      "sections": 8
    }
  },

  "sms_notification": {
    "message": "Short SMS message (160 chars max)",
    "fallback_to_email": true
  },

  "in_app_notification": {
    "title": "New Clinical Review Request",
    "message": "Brief notification text",
    "action_url": "https://review.url",
    "icon": "review-icon",
    "sound": "notification",
    "badge_count": 1
  }
}
```

## Email Content Structure

The email body should follow this structure:

### 1. Opening (Friendly Greeting)
- Address reviewer by name and credentials
- Express appreciation for their expertise
- Briefly state the purpose

**Tone**: Professional, collegial, respectful of their time

### 2. Content Summary (What's Being Reviewed)
- **Topic**: Clear statement of clinical topic
- **Format**: Type of content (clinical review, case discussion, etc.)
- **Scope**: Word count, number of sections
- **Target Audience**: Who will use this content
- **Context**: Why this content is important (knowledge gap, new evidence, clinical need)

**Formatting**: Use bullet points for easy scanning

### 3. Review Highlights (Why Your Input Matters)
Structured overview of what requires expert verification:

#### Critical Safety Items (HIGH Priority)
- Number of high-priority drug doses requiring verification
- Time-critical interventions to confirm
- Patient safety-critical thresholds
- Paediatric or special population dosing

#### Clinical Accuracy Verification
- Total items requiring confirmation (doses, thresholds, claims)
- Statistical claims needing validation
- Guideline alignment checks
- Uncited items needing source identification

#### Expert Clinical Pearls Needed
- Number of clinical pearls requested
- Topics requiring practical insights
- Common pitfalls to address
- Atypical presentations to highlight

**Tone**: Emphasize the unique value of their expertise

### 4. Specific Items Needing Attention

Provide concrete examples to help reviewer understand scope:

**Example Section**:
```markdown
### Doses Requiring Your Expert Verification

We need you to confirm these critical medication doses:

- **Noradrenaline** (septic shock): Stated as 0.1-0.5 mcg/kg/min IV - verify range
- **Amiodarone** (cardiac arrest): Stated as 300mg IV push - confirm dose and timing
- **Insulin** (DKA): Weight-based protocol verification needed

### Clinical Pearls We'd Love Your Input On

1. **Practical tip**: What's your go-to technique for difficult IO placement in obese patients?
2. **Recognition pearl**: What subtle signs of early sepsis do trainees commonly miss in elderly patients?
3. **Common pitfall**: What's the most frequent error you see with vasopressor management?
```

**Format**:
- Maximum 5-7 specific examples
- Mix high-impact items across categories
- Use **bold** for drug names and critical elements
- Keep examples concrete and specific

### 5. Placeholders and Knowledge Gaps

Highlight areas where content explicitly needs their expertise:

```markdown
### Areas Flagged for Your Expert Input

The draft includes these placeholders specifically for your insights:

- [CLINICAL PEARL NEEDED: Bedside technique for confirming ETT placement when capnography unavailable]
- [EXPERT INPUT NEEDED: Local antibiogram considerations for empiric sepsis coverage]
- [REGIONAL VARIATION: Alternative vasopressors when noradrenaline not readily available]
```

### 6. Review Process (Clear Instructions)

Step-by-step guidance:

```markdown
### How to Complete Your Review

**Time Required**: Approximately 45 minutes

**Process**:

1. **Access the review checklist** (attached as JSON file or accessible at [review URL])
2. **Verify clinical accuracy** (20 min)
   - Confirm all drug doses, thresholds, and statistical claims
   - Mark `verified: true` when confirmed
   - Add correct values and references where needed
3. **Provide clinical pearls** (15 min)
   - Answer the specific expert prompts
   - Draw on your clinical experience for practical insights
4. **Assess completeness** (10 min)
   - Note any missing sections or topics
   - Suggest areas needing expansion
5. **Submit your review** via [method: web form / email reply / JSON upload]

**Need help?** Contact [content creator] at [email] or reply to this email.
```

**Formatting**:
- Use numbered steps for clarity
- Include time estimates for each section
- Provide fallback contact method
- Offer technical support if needed

### 7. Timeline and Urgency

Clear deadline communication:

```markdown
### Timeline

**Review Due**: [Date] ([X days from now])
**Reason for Timeline**: [Project deadline context, e.g., "Conference submission deadline", "Course launch date"]
**Urgency**: [HIGH/MEDIUM/LOW] - [Brief justification]

If this timeline is challenging, please let us know immediately so we can discuss alternatives.
```

**Tone**: Respectful of their schedule, but clear about urgency

### 8. Contribution Recognition

Acknowledge their effort:

```markdown
### Your Contribution

- **Co-authorship**: You will be listed as a reviewing expert in the final publication
- **CME Credits**: [X hours] of continuing education credit available
- **FOAM Community Impact**: Your expertise will directly improve education for [audience size/reach]
- **Compensation**: [If applicable: Honorarium amount | Otherwise: Voluntary contribution]

We deeply value the time and expertise you're contributing to medical education.
```

### 9. Next Steps After Review

What happens after they submit:

```markdown
### What Happens Next

1. We'll review your feedback within 48 hours
2. Incorporate your corrections and clinical pearls into the draft
3. Send you the revised version for final approval (optional, 15 min)
4. Publish with your name credited as reviewing expert
5. Share final publication link with you

You'll remain in the loop throughout the process.
```

### 10. Closing

Warm, professional sign-off:

```markdown
Thank you for lending your clinical expertise to this project. The FOAM community benefits enormously from practitioners like you who take time to ensure educational content is accurate, practical, and evidence-based.

If you have any questions before starting, don't hesitate to reach out.

Best regards,
[Content Creator Name]
[Title/Credentials]
[Contact Information]

---
*Resuscitation EDucation Initiative (REdI)*
*Workforce Development & Education Unit*
*Metro North Health | Queensland Government*
```

## Slack Message Structure

Slack messages should be concise but actionable:

### Format

```markdown
:clipboard: **New Clinical Review Request**

Hey [Reviewer First Name]! We need your expert eyes on a new clinical review.

**Topic**: [Title]
**Time**: ~45 minutes
**Due**: [Date] ([X days])

**Quick Stats**:
- 8 HIGH priority doses to verify
- 6 clinical pearls needed (your specialty insights!)
- 45 total items

**What makes this urgent**: [Brief context]

[Button: Start Review] [Button: View Draft]

Questions? Ping @[content-creator] or reply here.

Thanks for making FOAM better! :raised_hands:
```

**Tone**: Casual, friendly, FOAM community vibe, emoji usage OK

## Web Dashboard Card Structure

Compact, scannable format for review dashboards. Uses REdI brand styling: Navy headers, Coral primary buttons, Teal accents, Light Gray card background with 8px border radius.

```
┌─────────────────────────────────────────────┐
│ ▌REdI                                       │  ← REdI Teal (#2B9E9E) left border
│ [!] HIGH PRIORITY                           │  ← Alert Red (#DC3545) badge
│                                             │
│ Review Request: Sepsis Management in ED    │  ← Navy (#1B3A5F) heading
│                                             │
│ Est. Time: 45 min | Due: Jan 28 (3 days)  │  ← Dark Gray (#333333) text
│                                             │
│ Items to Verify: 45                        │
│ └─ HIGH priority doses: 8                  │
│ └─ Clinical pearls needed: 6               │
│ └─ Statistical claims: 7                   │
│                                             │
│ Specialty: Emergency Medicine              │
│                                             │
│ [Start Review]  [View Draft]  [Decline]    │  ← Coral/Navy/Outline buttons
└─────────────────────────────────────────────┘
```

## SMS Notification (When Enabled)

Ultra-brief for mobile:

```
Clinical review request: [Topic]. Est. 45 min. Due [Date]. Check email for details or visit: [short-url]
```

## Tone and Style Guidelines

### Overall Tone
- **Collegial**: Expert-to-expert, not supervisor-to-subordinate
- **Respectful**: Acknowledge their time is valuable
- **Clear**: No ambiguity about expectations
- **Appreciative**: Genuine gratitude for their contribution
- **Action-oriented**: Make it easy to start immediately

### Language Patterns

**Use**:
- "We need your expertise on..."
- "Your insights would be invaluable for..."
- "This is where your clinical experience really matters..."
- "Specifically flagged for expert verification..."
- "Your contribution will directly improve..."

**Avoid**:
- "We need you to review..." (sounds like an obligation)
- "This is required..." (too demanding)
- "Please check if this is correct..." (undermines their authority)
- Technical jargon about the system/process
- Apologetic language ("Sorry to bother you...")

### Emphasis Patterns

Use **bold** for:
- Drug names
- Specific doses
- Deadlines
- Action items
- Priority levels

Use _italic_ for:
- Context or background
- Qualifications
- Optional elements

Use CAPS sparingly:
- Only for urgency flags: HIGH PRIORITY
- Never for entire sentences

## Dynamic Content Rules

### Urgency Indicators

**HIGH Urgency** (review due within 48 hours):
- Subject line prefix: "[URGENT]"
- Red priority badge
- Explanation of why urgent
- Offer of support/assistance
- Mobile-friendly formatting

**MEDIUM Urgency** (review due within 1 week):
- Subject line prefix: "[Review Requested]"
- Yellow/orange priority badge
- Standard timeline
- Normal formatting

**LOW Urgency** (review due beyond 1 week):
- Subject line: "Clinical Review Request:"
- Green/blue badge
- Flexible timeline language
- Mention of buffer time

### Time Estimates

Base calculation on checklist items:
- < 30 min: "Quick review"
- 30-60 min: "Approximately [X] minutes"
- 60-90 min: "About [X] hour"
- > 90 min: "Estimated [X] hours (can be split across sessions)"

### Specialty-Specific Language

**Emergency Medicine**:
- "Time-critical interventions"
- "Resuscitation protocols"
- "Stabilization strategies"

**Critical Care**:
- "ICU management protocols"
- "Organ support strategies"
- "Hemodynamic targets"

**Paediatrics**:
- "Weight-based dosing calculations"
- "Age-specific considerations"
- "Developmental factors"

**Anaesthesia**:
- "Perioperative management"
- "Airway techniques"
- "Pharmacokinetic considerations"

## Quality Checks

Before generating notifications, verify:

- [ ] All placeholders filled with actual data (no "[TODO]" markers)
- [ ] Reviewer name and credentials correct
- [ ] Review URL valid and accessible
- [ ] Due date realistic and clearly stated
- [ ] Time estimate matches checklist complexity
- [ ] Email body < 1000 words (respect attention span)
- [ ] Slack message < 500 characters (scannable)
- [ ] SMS < 160 characters
- [ ] All links working
- [ ] Contact information current
- [ ] Tone appropriate for relationship (formal vs. collegial)
- [ ] Mobile-friendly formatting (email/slack)
- [ ] Specific examples included (not just generic descriptions)
- [ ] Clear call-to-action in each format
- [ ] JSON output valid

## Example Scenarios

### Scenario 1: Urgent High-Stakes Review

**Context**: Sepsis guideline update, conference deadline in 3 days, 8 high-priority doses need verification

**Email Subject**: `[URGENT] Clinical Review Request: Sepsis Management Update (Due: Jan 28)`

**Urgency Justification**: Conference abstract submission deadline

**Emphasis**: High-priority patient safety items, time-critical nature, offer of phone support

### Scenario 2: Routine Quarterly Review

**Context**: Standard clinical update, 4 weeks until publication, moderate complexity

**Email Subject**: `Clinical Review Request: Community-Acquired Pneumonia Management`

**Urgency**: Medium, flexible timeline

**Emphasis**: Educational value, CME credits, community contribution

### Scenario 3: Expert Pearl Collection

**Context**: Draft complete but needs practical insights, 12 clinical pearls requested, low urgency

**Email Subject**: `Expert Input Needed: Clinical Pearls for Difficult Airway Management`

**Urgency**: Low, content mostly complete

**Emphasis**: Unique value of their practical experience, teaching impact, creative freedom

## Notes

- **Personalization**: Use reviewer name, credentials, and specialty throughout
- **Context**: Explain WHY this review matters (not just WHAT to review)
- **Clarity**: Make the process as simple as possible
- **Respect**: Acknowledge time investment explicitly
- **Flexibility**: Offer alternatives if timeline doesn't work
- **Follow-up**: Set expectations for next steps
- **Recognition**: Be clear about how contribution will be credited
- **Support**: Provide easy path to ask questions

## Integration Notes

This notification should be generated automatically by n8n workflow when:
1. Draft content reaches "ready for review" status
2. Validation checks complete
3. Reviewer checklist generated
4. Reviewer assigned

Delivery method determined by:
- Reviewer preferences (email/slack/both)
- Urgency level (HIGH → email + SMS + Slack)
- Time of day (respect working hours/timezone)
- Delivery confirmation tracking enabled
