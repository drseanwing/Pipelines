# CritLit Alpha Limitations and Known Issues

**Version:** 0.1.0-alpha
**Last Updated:** 2026-01-25

This document outlines the current limitations, known issues, and planned improvements for CritLit. As an alpha release, CritLit provides core systematic review workflows but lacks many features expected in production-ready tools.

---

## Current Limitations

### Search Capabilities

**Only PubMed Supported**
- **Limitation:** No integration with Embase, Cochrane Library, CINAHL, Web of Science, or other databases
- **Impact:** Users must manually export results from other databases and import them
- **Workaround:** Export citations as RIS/BibTeX from other sources and use manual import (feature planned for beta)
- **Planned:** Beta will support at least Cochrane Central Register of Controlled Trials

**No Automated Duplicate Detection**
- **Limitation:** No deduplication across imported searches or within PubMed results
- **Impact:** Manual duplicate removal required during screening
- **Workaround:** Use external tools (e.g., EndNote, Zotero) for deduplication before import
- **Planned:** Beta will include citation-based duplicate detection with configurable fuzzy matching

**Result Set Size Limit**
- **Limitation:** PubMed searches limited to 10,000 results maximum
- **Impact:** Very broad searches may be truncated
- **Workaround:** Refine search terms or split into multiple targeted searches
- **Note:** 10,000 is a practical limit for most systematic reviews; searches yielding more typically need refinement

### AI Screening

**Local LLM Only (Ollama)**
- **Limitation:** No cloud-based LLM support (OpenAI, Anthropic, Google)
- **Impact:**
  - Requires local Ollama installation
  - Performance depends on local hardware
  - Limited to models available via Ollama
- **Workaround:** Use Ollama with quantized models for reasonable performance on consumer hardware
- **Planned:** Beta may add optional cloud LLM support with API key configuration

**Accuracy Depends on Model Quality**
- **Limitation:** Smaller/quantized models may have lower screening accuracy
- **Impact:** More false positives/negatives requiring human review
- **Recommendation:** Use llama3.1:8b or larger models for best results
- **Mitigation:** Always perform human review of AI decisions; AI is assistive, not autonomous

**No Dual-Reviewer Verification**
- **Limitation:** AI provides single-pass screening only
- **Impact:** Does not replace second independent reviewer requirement for rigorous systematic reviews
- **Workaround:** Export AI-screened results and have second reviewer independently assess
- **Planned:** Beta will support multi-reviewer workflows with conflict resolution

### Document Processing

**No Full-Text PDF Retrieval**
- **Limitation:** Cannot automatically download full-text PDFs from PubMed, institutional access, or open repositories
- **Impact:** Users must manually retrieve full texts for included studies
- **Workaround:** Use PubMed links provided in study details to access publisher sites
- **Planned:** Beta may add integration with Unpaywall API for open-access retrieval

**No Data Extraction Workflows**
- **Limitation:** No structured data extraction forms or AI-assisted extraction
- **Impact:** Users must export included studies and use external tools for data extraction
- **Workaround:** Export included studies as CSV and use spreadsheet templates
- **Planned:** Beta will include customizable data extraction forms

**No Risk of Bias Assessment**
- **Limitation:** No built-in tools for Cochrane Risk of Bias, ROBINS-I, or other quality assessment
- **Impact:** Quality assessment must be performed externally
- **Workaround:** Export included studies and use Cochrane's RevMan or ROBIS tools
- **Planned:** Beta will support common risk of bias tools with AI-assisted assessment

### Human Review Interface

**Basic Form Interface Only**
- **Limitation:** Simple include/exclude/maybe form with reason text box
- **Impact:** No structured reason selection, tags, or advanced filtering
- **Workaround:** Use consistent reason phrases for easier filtering later
- **Planned:** Beta will add predefined exclusion reasons, tags, and advanced filters

**No Collaborative Features**
- **Limitation:** Single-user application only
- **Impact:**
  - Cannot assign studies to different reviewers
  - No real-time collaboration
  - No centralized review database
- **Workaround:** Multiple reviewers can maintain separate CritLit instances and reconcile externally
- **Planned:** Future version may add multi-user SQLite or PostgreSQL backend

**No Conflict Resolution Workflow**
- **Limitation:** No built-in comparison of reviewer decisions or conflict flagging
- **Impact:** Teams must manually compare exports to identify conflicts
- **Workaround:** Export decisions from each reviewer and use spreadsheet VLOOKUP to identify discrepancies
- **Planned:** Beta will support reviewer comparison and conflict highlighting

### Reporting and Export

**PRISMA Counts Only**
- **Limitation:** Provides study counts for PRISMA flow diagram but does not generate the diagram
- **Impact:** Users must manually create PRISMA diagram in external tools
- **Workaround:** Use counts to populate PRISMA diagram template in PowerPoint, Word, or R (PRISMAstatement package)
- **Planned:** Beta will generate PRISMA flow diagram as SVG/PNG

**No Export Formats Beyond CSV**
- **Limitation:** Cannot export to Word tables, PDF reports, or reference manager formats
- **Impact:** Additional manual formatting required for manuscript preparation
- **Workaround:** Import CSV into reference manager or use spreadsheet to format tables
- **Planned:** Beta will support RIS, BibTeX, and Word table export

**No Synthesis Workflows**
- **Limitation:** No meta-analysis, narrative synthesis, or evidence grading features
- **Impact:** Users must export to RevMan, R, or GRADE tools for synthesis
- **Workaround:** Export included studies with extracted data for use in statistical software
- **Note:** Synthesis tools are complex; may remain out of scope for CritLit

---

## Known Issues

### 1. PubMed API Rate Limiting
**Symptom:** Searches occasionally fail with "429 Too Many Requests" error
**Cause:** PubMed NCBI enforces 3 requests/second limit
**Workaround:** Wait 30 seconds and retry search
**Fix Planned:** Beta will add automatic retry with exponential backoff
**Tracking:** Issue #12

### 2. Large Result Sets Cause UI Slowdown
**Symptom:** Screening interface becomes sluggish with >5,000 studies
**Cause:** Full result set loaded into memory and DOM
**Workaround:** Use more specific search terms to reduce result count
**Fix Planned:** Beta will implement pagination and virtual scrolling
**Tracking:** Issue #18

### 3. Special Characters in Search Terms
**Symptom:** Search terms with quotes, parentheses, or boolean operators may not work as expected
**Cause:** Incomplete PubMed query syntax support
**Workaround:** Use PubMed Advanced Search Builder to test queries, then paste into CritLit
**Fix Planned:** Alpha patch (0.1.1) will add query validation and syntax help
**Tracking:** Issue #23

### 4. AI Screening Fails Silently on Ollama Connection Loss
**Symptom:** AI screening stops progressing without error message
**Cause:** Lost connection to Ollama not detected
**Workaround:** Restart Ollama service and re-run AI screening
**Fix Planned:** Beta will add connection health checks and user-facing error messages
**Tracking:** Issue #31

### 5. Study Details Modal Does Not Show Abstract Formatting
**Symptom:** Abstracts displayed as plain text without section headings
**Cause:** PubMed XML abstract structure not parsed
**Workaround:** Click PubMed link to view formatted abstract on NCBI site
**Fix Planned:** Alpha patch (0.1.1) will parse structured abstracts
**Tracking:** Issue #29

---

## Future Features (Beta Roadmap)

### Planned for Beta (v0.2.0)

**Core Functionality**
- [ ] Citation deduplication across searches
- [ ] Multi-database support (Cochrane CENTRAL)
- [ ] Manual citation import (RIS, BibTeX, Endnote XML)
- [ ] Full-text PDF management
- [ ] Data extraction forms (customizable)
- [ ] PRISMA flow diagram generation

**AI Enhancements**
- [ ] Cloud LLM support (OpenAI, Anthropic) as optional alternative to Ollama
- [ ] AI-assisted data extraction
- [ ] AI-powered search term suggestion
- [ ] Confidence scores for AI screening decisions

**Collaboration**
- [ ] Multi-reviewer workflows
- [ ] Reviewer assignment
- [ ] Conflict detection and resolution
- [ ] Decision comparison view

**Reporting**
- [ ] Export to RIS, BibTeX
- [ ] Export to Word tables
- [ ] Customizable report templates
- [ ] Evidence summary tables

**Usability**
- [ ] Predefined exclusion reason library
- [ ] Study tagging and categories
- [ ] Advanced search/filtering within results
- [ ] Keyboard shortcuts for screening
- [ ] Undo/redo for decisions

### Under Consideration (Post-Beta)

- Risk of bias assessment (Cochrane RoB 2, ROBINS-I)
- Evidence grading (GRADE)
- Network meta-analysis support
- Full database backend (PostgreSQL) for teams
- Browser-based deployment (web app)
- API for integration with other tools

---

## Feature Requests

We welcome feature requests from the systematic review community. Before requesting, please:

1. Check this document to see if the feature is already planned
2. Search existing GitHub Issues to avoid duplicates
3. Provide use case and priority level when submitting

**Submit requests at:** https://github.com/drseanwing/CritLit/issues/new?template=feature_request.md

---

## Getting Help

### Reporting Bugs

If you encounter a bug not listed in "Known Issues":

1. Check if it's reproducible
2. Note your environment (OS, Python version, Ollama version)
3. Capture error messages or screenshots
4. Submit at: https://github.com/drseanwing/CritLit/issues/new?template=bug_report.md

### Support Resources

- **Documentation:** [docs/](./README.md)
- **Installation Help:** [INSTALL.md](../INSTALL.md)
- **User Guide:** [USER_GUIDE.md](./USER_GUIDE.md)
- **GitHub Discussions:** https://github.com/drseanwing/CritLit/discussions
- **Email Support:** drseanwing@gmail.com (response within 3 business days)

### Contributing

Interested in helping address these limitations? See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Development setup
- Coding standards
- How to pick an issue to work on
- Pull request process

---

## Acknowledgment

CritLit is alpha software developed to demonstrate AI-assisted systematic review workflows. It is **not** a replacement for established tools like Covidence, RevMan, or DistillerSR for production systematic reviews.

We appreciate your understanding of these limitations and welcome your feedback to help prioritize beta improvements.

**Thank you for testing CritLit!**
