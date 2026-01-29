# Alpha Test Task List: CritLit SLR Pipeline

This document outlines the tasks required to go from the current state (specifications only) to a working alpha test of the Autonomous Systematic Literature Review Pipeline. Each task follows the Topic Scope Test: "One Sentence Without 'And'".

## Current State
- ✓ Comprehensive technical specifications document exists
- ✓ Full alpha implementation complete
- ✓ Database schema instantiated and tested
- ✓ n8n workflows created and operational

## Target Alpha State
- Core infrastructure running (PostgreSQL, n8n, Ollama)
- Basic document ingestion from PubMed functional
- Title/abstract screening with AI agent operational
- Checkpoint/resume capability working
- Basic PRISMA flow tracking in place

---

## Phase 1: Infrastructure Foundation

### Infrastructure Setup Tasks

1. ✓ Create Docker Compose configuration file with all required services.

2. ✓ Configure PostgreSQL service with required performance parameters.

3. ✓ Configure n8n service with execution queue mode enabled.

4. ✓ Configure n8n worker service for background job processing.

5. ✓ Configure Redis service for n8n queue management.

6. ✓ Configure Ollama service with GPU support for local LLM inference.

7. ✓ Create environment variable template file for sensitive credentials.

8. ✓ Create .gitignore file to exclude environment secrets.

9. ✓ Write initialization script to enable PostgreSQL extensions (vector, pg_trgm, uuid-ossp).

10. ✓ Write SQL migration to create reviews table with JSONB fields for PICO criteria.

11. ✓ Write SQL migration to create search_executions table for database query tracking.

12. ✓ Write SQL migration to create documents table with external ID indexing.

13. ✓ Write SQL migration to create document_embeddings table with vector column.

14. ✓ Write SQL migration to create HNSW index for semantic search on embeddings.

15. ✓ Write SQL migration to create screening_decisions table with confidence scoring.

16. ✓ Write SQL migration to create workflow_state table for checkpoint management.

17. ✓ Write SQL migration to create audit_log table for decision tracking.

18. ✓ Write SQL migration to create prisma_flow table for PRISMA diagram data.

19. ✓ Write SQL migration to configure biomedical text search dictionary.

20. ✓ Write SQL migration to create full-text search index on documents.

21. ✓ Write SQL migration to create trigram index for duplicate detection.

22. ✓ Create database initialization script that runs all migrations in order.

23. ✓ Create startup script that launches all Docker services with health validation.

24. ✓ Create verification script that confirms PostgreSQL accepts connections.

25. ✓ Create verification script that confirms vector extension is operational.

26. ✓ Create verification script that confirms n8n web interface is accessible.

27. ✓ Create verification script that confirms Ollama API endpoint responds.

28. ✓ Document deployment instructions in a README file.

---

## Phase 2: Basic n8n Workflows

### Workflow Infrastructure Tasks

29. ✓ Create main coordinator workflow file structure.

30. ✓ Configure webhook trigger node for coordinator workflow entry point.

31. ✓ Configure PostgreSQL node to load review state from database.

32. ✓ Configure coordinator AI agent node with task routing instructions.

33. ✓ Configure stage router switch node for workflow delegation.

34. ✓ Configure checkpoint save node to persist workflow state.

35. ✓ Create protocol setup workflow file structure.

36. ✓ Create search execution workflow file structure.

37. ✓ Create screening batch workflow file structure.

38. ✓ Export workflow JSON files to workflows directory for version control.

---

## Phase 3: PubMed Integration

### Search Integration Tasks

39. ✓ Create PubMed credentials configuration in n8n for API key storage.

40. ✓ Configure HTTP request node for PubMed ESearch API with history server.

41. ✓ Configure HTTP request node for PubMed EFetch API with XML retrieval.

42. ✓ Create code node to parse PubMed XML into structured document objects.

43. ✓ Create code node to extract document metadata fields from PubMed XML.

44. ✓ Configure PostgreSQL insert node to save parsed documents to database.

45. ✓ Create error handling node for PubMed API rate limit responses.

46. ✓ Create batch processing loop for large result sets using history server.

47. ✓ Configure search execution logging to track query execution metadata.

48. ✓ Create test workflow that executes a small PubMed search with database persistence.

---

## Phase 4: Screening Agent Implementation

### AI Screening Tasks

49. ✓ Create screening prompt template with PICO framework placeholders.

50. ✓ Configure Ollama chat model node with Llama 3.1 model specification.

51. ✓ Create PostgreSQL query node to fetch unscreened documents in batches.

52. ✓ Configure split in batches node with appropriate batch size for screening.

53. ✓ Create screening agent tool definition with input schema for PICO criteria.

54. ✓ Configure AI agent node with screening system prompt for structured output.

55. ✓ Create code node to parse screening agent JSON output into decision objects.

56. ✓ Create code node to calculate confidence scores for decision routing.

57. ✓ Configure PostgreSQL insert node to save screening decisions with rationale.

58. ✓ Create conditional node to route low-confidence decisions for human review.

59. ✓ Configure rate limiting wait node to prevent overwhelming local LLM.

60. ✓ Create screening agent that processes a single document into structured decision.

61. ✓ Create batch screening workflow that processes 100 documents sequentially.

62. ✓ Configure screening stage router in coordinator to invoke screening workflow.

---

## Phase 5: Checkpoint and Resume

### State Management Tasks

63. ✓ Create checkpoint data structure schema for workflow state serialization.

64. ✓ Configure workflow state upsert node to save checkpoint after each batch.

65. ✓ Create resume logic to query last checkpoint for continuation.

66. ✓ Configure error recovery node to roll back to last checkpoint on failure.

67. ✓ Create checkpoint validation query to verify state consistency.

68. ✓ Create manual resume trigger webhook for restarting failed workflows.

69. ✓ Configure audit logging for checkpoint creation events.

70. ✓ Test checkpoint creation by interrupting workflow mid-execution.

71. ✓ Test resume functionality by restarting from saved checkpoint.

---

## Phase 6: PRISMA Flow Tracking

### Reporting Infrastructure Tasks

72. ✓ Create PRISMA flow calculation query for records identified count.

73. ✓ Create PRISMA flow calculation query for duplicates removed count.

74. ✓ Create PRISMA flow calculation query for records screened count.

75. ✓ Create PRISMA flow calculation query for records excluded at screening stage.

76. ✓ Configure PostgreSQL node to upsert PRISMA flow data after screening completion.

77. ✓ Create query node to retrieve current PRISMA flow data for display.

78. ✓ Create code node to format PRISMA counts for human-readable output.

---

## Phase 7: Basic Human Review Interface

### Review Checkpoint Tasks

79. ✓ Configure wait node with form for human approval at screening completion.

80. ✓ Create form field to display screening batch statistics summary.

81. ✓ Create form dropdown field for approval decision options.

82. ✓ Create form text field for reviewer notes.

83. ✓ Configure conditional node to handle approval, revision, or escalation decision.

84. ✓ Create notification mechanism for pending human review checkpoints.

85. ✓ Configure timeout handling for human review wait nodes.

---

## Phase 8: Integration Testing

### End-to-End Validation Tasks

86. ✓ Create test dataset with sample PICO criteria for a known review topic.

87. ✓ Create test PubMed query that returns a manageable number of results for testing.

88. ✓ Deploy infrastructure using Docker Compose with service verification.

89. ✓ Load database schema with table creation verification.

90. ✓ Import test review record into reviews table with sample PICO criteria.

91. ✓ Execute PubMed search workflow with database persistence verification.

92. ✓ Verify document count in database matches PubMed search results count.

93. ✓ Pull Llama 3.1 model in Ollama with availability verification.

94. ✓ Execute screening workflow on test documents with decision persistence verification.

95. ✓ Verify screening decisions table contains entries with confidence scores.

96. ✓ Verify low-confidence decisions trigger human review checkpoint correctly.

97. ✓ Verify checkpoint data is saved to workflow_state table.

98. ✓ Manually approve human review checkpoint with continuation verification.

99. ✓ Verify PRISMA flow counts are calculated with correct persistence.

100. ✓ Verify audit log captures all key decisions with state transitions.

101. ✓ Stop workflow to verify checkpoint resume functionality.

102. ✓ Review all generated data for PRISMA compliance.

103. ✓ Document any bugs, issues, or deviations from specifications.

104. ✓ Create troubleshooting guide for common deployment issues.

---

## Phase 9: Alpha Documentation

### Documentation Tasks

105. ✓ Write quickstart guide for deploying the alpha version.

106. ✓ Document environment variable configuration requirements.

107. ✓ Document PubMed API key acquisition process.

108. ✓ Document Ollama model installation with verification steps.

109. ✓ Write user guide for creating a new review in the system.

110. ✓ Write user guide for executing PubMed search workflow.

111. ✓ Write user guide for reviewing screening decisions.

112. ✓ Write user guide for interpreting PRISMA flow counts.

113. ✓ Document current limitations and known issues.

114. ✓ Document future work needed for beta release.

115. ✓ Create architecture diagram showing implemented components.

116. ✓ Create workflow diagram showing alpha pipeline flow.

---

## Phase 10: Alpha Release Preparation

### Release Tasks

117. ✓ Create version tag for alpha release in repository.

118. ✓ Package sample test data with alpha release.

119. ✓ Create release notes documenting alpha capabilities.

120. ✓ Create release notes documenting alpha limitations.

121. ✓ Validate all Docker images are available in public registries.

122. ✓ Test deployment on clean system to verify installation process.

123. ✓ Create feedback collection mechanism for alpha testers.

124. ✓ Prepare demo video showing alpha functionality.

---

## Success Criteria for Alpha Test

The alpha test is considered successful when:

- ✓ Infrastructure deploys successfully via Docker Compose
- ✓ PubMed search retrieves and stores documents in PostgreSQL
- ✓ AI screening agent processes documents and saves decisions
- ✓ Checkpoint/resume works after workflow interruption
- ✓ PRISMA flow counts are accurate for processed documents
- ✓ Human review checkpoint blocks workflow and resumes after approval
- ✓ Complete audit trail exists for all automated decisions
- ✓ Documentation enables new user to deploy and test the system

---

## Out of Scope for Alpha

The following items from the full specification are **not** required for alpha:

- Multi-database search (only PubMed required for alpha)
- Duplicate detection (will process duplicates for alpha)
- Full-text PDF retrieval
- Data extraction workflows
- Risk of bias assessment
- GRADE assessment
- Synthesis workflows
- I-Librarian integration
- Interview refinement workflows
- Multiple LLM provider support (only Ollama required)
- Production security hardening
- Performance optimization
- Advanced error recovery
- Comprehensive test coverage

These features will be added in subsequent beta and production releases.

---

## Notes on Task Organization

This task list is organized to:
- Build foundational infrastructure first
- Add workflows incrementally
- Integrate external services one at a time
- Test each major component before moving forward
- Document as capabilities are proven

Each task is atomic, testable, and moves the project toward a demonstrable alpha release.
