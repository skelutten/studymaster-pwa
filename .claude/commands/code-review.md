# Enhanced Multi-Agent Review Workflow: Complete Fixed Implementation

**Target:** $ARGUMENTS
**Depth:** deep
**Focus:** Comprehensive quality assurance through specialized agents with robust error handling
**Scope:** Deploy seven specialized agents with MCP tools for optimal development workflow

## Agent Architecture

### Agent S (Security Reviewer)
**Role:** Security vulnerability assessment and compliance

Performs comprehensive security analysis including OWASP Top 10, dependency vulnerabilities, and compliance requirements.

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Input validation and sanitization
   - Authentication and authorization flaws
   - SQL injection and XSS vulnerabilities
   - Insecure direct object references
   - Security misconfiguration
   - Sensitive data exposure
   - Cross-site request forgery (CSRF)
   - Known vulnerable dependencies

2. **High Priority**
   - Cryptographic implementation
   - Session management
   - Access control mechanisms
   - API security patterns

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager: 
      priority: "high"
      operations: ["load_security_standards", "update_cve_data"]
      cache_categories: ["security_standards", "vulnerability_databases", "compliance_requirements"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search: 
      priority: "medium"
      rate_limit: 10
      fallback_for_cache_miss: true
      queries_saved_by_cache: "track_metrics"
  - context7: 
      priority: "low"
      use_case: "framework_specific_security"
  - sequential-thinking: 
      priority: "high"
      use_case: "vulnerability_analysis_chain"

error_handling:
  cache_corruption: "rebuild_from_security_backup"
  network_failure: "use_cached_standards_with_warning"
  timeout: "continue_with_basic_security_checks"
```

### Agent C (Clean Code Reviewer)
**Role:** Code quality and maintainability assessment

Reviews code against clean code principles, design patterns, and maintainability metrics.

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Naming conventions and clarity
   - Function design and single responsibility
   - Code structure and organization
   - Error handling patterns
   - Documentation quality
   - Class and object design
   - Testability considerations

2. **High Priority**
   - DRY principle adherence
   - SOLID principles compliance
   - Code complexity metrics
   - Refactoring opportunities

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_clean_code_standards", "update_pattern_library"]
      cache_categories: ["clean_code_practices", "design_patterns", "refactoring_techniques"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "low"
      rate_limit: 5
      use_case: "new_methodology_updates"
  - context7:
      priority: "high"
      use_case: "language_specific_idioms"
  - sequential-thinking:
      priority: "high"
      use_case: "code_quality_analysis_chain"

error_handling:
  cache_corruption: "rebuild_from_methodology_backup"
  network_failure: "proceed_with_cached_standards"
  timeout: "provide_basic_code_quality_assessment"
```

### Agent P (Performance Reviewer)
**Role:** Performance optimization and efficiency analysis

Analyzes code for performance bottlenecks, scalability issues, and resource optimization.

**Dependencies:** 
- Requires: `code_structure_analysis` from Agent C
- Provides: `performance_metrics`, `optimization_suggestions`, `bottleneck_analysis`

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Algorithm complexity (Big O analysis)
   - Memory leaks and resource management
   - Database query optimization
   - Network call efficiency
   - Caching strategies

2. **High Priority**
   - Lazy loading implementation
   - Concurrent processing opportunities
   - Resource pooling
   - Bundle size optimization

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_performance_benchmarks", "update_optimization_patterns"]
      cache_categories: ["performance_benchmarks", "optimization_patterns", "profiling_standards"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "medium"
      rate_limit: 8
      use_case: "framework_specific_optimizations"
  - context7:
      priority: "high"
      use_case: "framework_performance_patterns"
  - sequential-thinking:
      priority: "high"
      use_case: "performance_bottleneck_analysis"

error_handling:
  dependency_failure: "skip_advanced_analysis_continue_basic"
  cache_corruption: "rebuild_from_benchmark_backup"
  network_failure: "use_cached_benchmarks_with_staleness_warning"
  timeout: "provide_algorithmic_complexity_analysis_only"
```

### Agent T (Testing Reviewer)
**Role:** Test coverage and quality assessment

Evaluates test completeness, quality, and testing strategies.

**Dependencies:**
- Requires: `code_structure_analysis` from Agent C, `security_requirements` from Agent S
- Provides: `test_coverage`, `test_quality`, `testing_strategy`

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Test coverage for critical paths
   - Unit test quality and isolation
   - Integration test coverage
   - End-to-end test scenarios
   - Mock and stub appropriateness

2. **High Priority**
   - Test maintainability
   - Test performance
   - Testing pyramid compliance
   - CI/CD integration

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_testing_standards", "update_framework_patterns"]
      cache_categories: ["testing_frameworks", "test_strategies", "coverage_standards"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "medium"
      rate_limit: 6
      use_case: "testing_framework_updates"
  - context7:
      priority: "high"
      use_case: "framework_testing_patterns"
  - sequential-thinking:
      priority: "high"
      use_case: "test_coverage_analysis"

error_handling:
  dependency_failure: "proceed_with_basic_coverage_analysis"
  cache_corruption: "rebuild_from_testing_backup"
  network_failure: "use_cached_testing_standards"
  timeout: "provide_coverage_metrics_only"
```

### Agent A (Architecture Reviewer)
**Role:** System design and architectural assessment

Reviews overall system architecture, design patterns, and scalability considerations.

**Dependencies:**
- Requires: `security_requirements` from Agent S, `performance_constraints` from Agent P
- Provides: `architectural_assessment`, `scalability_analysis`, `design_recommendations`

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Architectural pattern compliance
   - Dependency management
   - Service boundaries and coupling
   - Data flow and state management
   - API design consistency

2. **High Priority**
   - Scalability considerations
   - Deployment architecture
   - Configuration management
   - Error propagation strategies

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_architecture_patterns", "update_design_principles"]
      cache_categories: ["architecture_patterns", "design_principles", "scalability_standards"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "medium"
      rate_limit: 7
      use_case: "current_architectural_trends"
  - context7:
      priority: "high"
      use_case: "framework_architectural_guidance"
  - sequential-thinking:
      priority: "high"
      use_case: "system_design_analysis"

error_handling:
  dependency_failure: "provide_general_architectural_assessment"
  cache_corruption: "rebuild_from_architecture_backup"
  network_failure: "use_cached_patterns_with_staleness_notice"
  timeout: "focus_on_pattern_compliance_only"
```

### Agent D (Documentation Reviewer)
**Role:** Documentation quality and completeness assessment

Evaluates code documentation, API documentation, and project documentation.

**Dependencies:**
- Requires: `architectural_decisions` from Agent A
- Provides: `documentation_quality`, `completeness_analysis`, `documentation_plan`

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - API documentation completeness
   - Code comment quality and necessity
   - README and setup instructions
   - Architecture documentation
   - Deployment guides

2. **High Priority**
   - Inline documentation accuracy
   - Example code quality
   - Troubleshooting guides
   - Change log maintenance

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_documentation_standards", "update_writing_guidelines"]
      cache_categories: ["documentation_standards", "api_doc_practices", "writing_guidelines"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "low"
      rate_limit: 3
      use_case: "documentation_best_practices"
  - context7:
      priority: "medium"
      use_case: "framework_documentation_requirements"
  - sequential-thinking:
      priority: "high"
      use_case: "documentation_completeness_analysis"

error_handling:
  dependency_failure: "proceed_with_general_documentation_review"
  cache_corruption: "rebuild_from_documentation_backup"
  network_failure: "use_cached_standards_only"
  timeout: "focus_on_completeness_check_only"
```

### Agent M (Monitoring & Observability Reviewer)
**Role:** Logging, monitoring, and observability assessment

Reviews implementation of logging, metrics, tracing, and monitoring capabilities.

**Dependencies:**
- Requires: `architectural_decisions` from Agent A, `performance_requirements` from Agent P
- Provides: `observability_assessment`, `monitoring_recommendations`, `alerting_strategy`

**Review Priorities (in order):**
1. **Critical Issues (BLOCKING)**
   - Error logging and alerting
   - Performance metrics collection
   - Security event logging
   - Health check implementation
   - Distributed tracing setup

2. **High Priority**
   - Log level appropriateness
   - Metrics naming conventions
   - Dashboard and alerting rules
   - Debugging capabilities

**MCP Tool Usage Guidelines:**
```yaml
mcp_tools:
  - cache_manager:
      priority: "high"
      operations: ["load_monitoring_practices", "update_tooling_recommendations"]
      cache_categories: ["monitoring_practices", "observability_standards", "tooling_updates"]
      lock_timeout: 30
      retry_attempts: 3
  - web_search:
      priority: "high"
      rate_limit: 10
      use_case: "current_observability_tools"
  - context7:
      priority: "high"
      use_case: "platform_monitoring_solutions"
  - sequential-thinking:
      priority: "high"
      use_case: "observability_strategy_analysis"

error_handling:
  dependency_failure: "provide_generic_monitoring_recommendations"
  cache_corruption: "rebuild_from_monitoring_backup"
  network_failure: "use_cached_practices_warn_about_staleness"
  timeout: "focus_on_logging_implementation_only"
```

## Cache Management System (Fixed)

### Atomic Cache Operations with Locking
```yaml
cache_manager_implementation:
  lock_mechanism:
    type: "file_based_locks"
    lock_directory: ".code_review_cache/.locks"
    lock_timeout_seconds: 30
    retry_attempts: 3
    backoff_multiplier: 2
    
  operations:
    read_cache:
      1. "acquire_shared_lock(category)"
      2. "validate_cache_integrity()"
      3. "read_cache_files()"
      4. "release_lock()"
      5. "return_data_or_null_if_corrupted()"
    
    write_cache:
      1. "acquire_exclusive_lock(category)"
      2. "create_backup_of_existing_cache()"
      3. "write_new_data_with_atomic_rename()"
      4. "update_metadata_and_checksums()"
      5. "release_lock()"
      6. "cleanup_backup_on_success()"
    
    update_cache:
      1. "acquire_exclusive_lock(category)"
      2. "read_existing_cache_with_validation()"
      3. "merge_new_data_intelligently()"
      4. "validate_merged_data_structure()"
      5. "write_atomically_with_backup()"
      6. "release_lock()"

cache_structure:
  base_directory: ".code_review_cache"
  lock_directory: ".code_review_cache/.locks"
  backup_directory: ".code_review_cache/.backups"
  
  categories:
    security_standards:
      files:
        - "owasp_top10_2025.json"
        - "cve_databases.json"
        - "security_frameworks.json"
        - "compliance_requirements.json"
      metadata: "security_standards_metadata.json"
      max_age_hours: 24
      validation_required: true
      
    clean_code_practices:
      files:
        - "design_patterns.json"
        - "refactoring_guidelines.json"
        - "naming_conventions.json"
        - "methodology_updates.json"
      metadata: "clean_code_metadata.json"
      max_age_hours: 720  # 30 days
      validation_required: false
      
    performance_benchmarks:
      files:
        - "algorithm_complexity.json"
        - "optimization_techniques.json"
        - "framework_performance.json"
        - "profiling_standards.json"
      metadata: "performance_metadata.json"
      max_age_hours: 336  # 14 days
      validation_required: false
      
    testing_frameworks:
      files:
        - "unit_testing_best_practices.json"
        - "integration_testing.json"
        - "coverage_standards.json"
        - "framework_updates.json"
      metadata: "testing_metadata.json"
      max_age_hours: 720  # 30 days
      validation_required: false
      
    architecture_patterns:
      files:
        - "microservices_patterns.json"
        - "design_principles.json"
        - "scalability_patterns.json"
        - "deployment_patterns.json"
      metadata: "architecture_metadata.json"
      max_age_hours: 720  # 30 days
      validation_required: false
      
    documentation_standards:
      files:
        - "api_documentation.json"
        - "code_commenting.json"
        - "project_documentation.json"
        - "writing_guidelines.json"
      metadata: "documentation_metadata.json"
      max_age_hours: 2160  # 90 days
      validation_required: false
      
    monitoring_practices:
      files:
        - "observability_tools.json"
        - "logging_standards.json"
        - "metrics_collection.json"
        - "alerting_patterns.json"
      metadata: "monitoring_metadata.json"
      max_age_hours: 336  # 14 days
      validation_required: false

cache_metadata_schema:
  category: "string"
  last_updated: "ISO8601_timestamp"
  expiry_date: "ISO8601_timestamp"
  cache_version: "semantic_version"
  source_urls: ["array_of_urls"]
  search_queries_used: ["array_of_queries"]
  validation_checksum: "SHA256_hash"
  file_sizes: {"filename": "size_in_bytes"}
  compression_enabled: "boolean"
  backup_available: "boolean"
```

## Enhanced Workflow with Dependency Management

### Execution Phases with Explicit Dependencies
```yaml
execution_flow:
  phase_0_initialization:
    name: "Cache and System Initialization"
    timeout_minutes: 5
    operations:
      1. "validate_configuration_schema()"
      2. "initialize_cache_directory_structure()"
      3. "check_cache_integrity_all_categories()"
      4. "plan_cache_refresh_strategy()"
      5. "warm_essential_caches_if_needed()"
      6. "validate_mcp_tool_availability()"
    
    error_handling:
      cache_corruption: "rebuild_from_backups_or_fresh"
      disk_space_low: "cleanup_old_caches_or_warn"
      mcp_tools_unavailable: "fail_fast_with_clear_message"
      network_unavailable: "proceed_with_cached_data_only"

  phase_1_independent_reviews:
    name: "Security and Clean Code (Parallel)"
    agents: ["security_reviewer", "clean_code_reviewer"]
    execution_mode: "parallel"
    timeout_minutes: 15
    dependencies: []
    
    agent_configs:
      security_reviewer:
        cache_strategy: "always_validate_freshness"
        web_search_limit: 10
        critical_failure_behavior: "fail_workflow"
        
      clean_code_reviewer:
        cache_strategy: "use_cached_if_valid"
        web_search_limit: 5
        critical_failure_behavior: "continue_with_warning"
    
    phase_success_criteria:
      - "At least one agent completes successfully"
      - "Security agent must complete if enabled"
      - "No critical system errors"

  phase_2_dependent_reviews:
    name: "Performance and Testing (Parallel)"
    agents: ["performance_reviewer", "testing_reviewer"]
    execution_mode: "parallel"
    timeout_minutes: 15
    dependencies: 
      - "phase_1_independent_reviews"
    
    data_requirements:
      performance_reviewer:
        requires_from_clean_code: ["code_structure_analysis", "complexity_metrics"]
        fallback_behavior: "basic_algorithmic_analysis_only"
        
      testing_reviewer:
        requires_from_clean_code: ["code_structure_analysis", "testability_assessment"]
        requires_from_security: ["security_requirements", "critical_paths"]
        fallback_behavior: "coverage_analysis_only"
    
    phase_success_criteria:
      - "At least one agent completes successfully"
      - "Required data dependencies are satisfied"

  phase_3_architecture_review:
    name: "Architecture Assessment (Sequential)"
    agents: ["architecture_reviewer"]
    execution_mode: "sequential"
    timeout_minutes: 10
    dependencies:
      - "phase_1_independent_reviews" 
      - "phase_2_dependent_reviews"
    
    data_requirements:
      architecture_reviewer:
        requires_from_security: ["security_requirements", "compliance_needs"]
        requires_from_performance: ["performance_constraints", "scalability_needs"]
        fallback_behavior: "general_architectural_assessment"
    
    phase_success_criteria:
      - "Architecture agent completes successfully"
      - "Architectural decisions are documented"

  phase_4_final_reviews:
    name: "Documentation and Monitoring (Parallel)"
    agents: ["documentation_reviewer", "monitoring_reviewer"]
    execution_mode: "parallel"
    timeout_minutes: 10
    dependencies:
      - "phase_3_architecture_review"
    
    data_requirements:
      documentation_reviewer:
        requires_from_architecture: ["architectural_decisions", "design_patterns_used"]
        fallback_behavior: "general_documentation_completeness_check"
        
      monitoring_reviewer:
        requires_from_architecture: ["system_boundaries", "critical_components"]
        requires_from_performance: ["performance_requirements", "bottlenecks"]
        fallback_behavior: "basic_logging_assessment"
    
    phase_success_criteria:
      - "At least one agent completes successfully"
      - "Documentation quality is assessed"

  phase_5_consensus_building:
    name: "Consensus and Final Recommendations"
    agents: ["consensus_builder"]
    execution_mode: "sequential"
    timeout_minutes: 10
    dependencies: 
      - "All previous phases"
    
    consensus_algorithm:
      type: "weighted_priority_consensus"
      conflict_resolution: "rule_based_with_escalation"
      confidence_threshold: 0.70
      manual_review_threshold: 0.50
    
    phase_success_criteria:
      - "Consensus is reached or conflicts are properly escalated"
      - "Final recommendations are generated"
      - "Quality gates are evaluated"
```

## Consensus Algorithm Implementation

### Weighted Consensus Builder
```yaml
consensus_builder:
  agent_weights:
    security_reviewer: 1.0      # Security issues are always blocking
    clean_code_reviewer: 0.8    # High importance for maintainability
    performance_reviewer: 0.7   # Important but context-dependent
    testing_reviewer: 0.9       # Critical for quality assurance
    architecture_reviewer: 0.8  # Important for long-term success
    documentation_reviewer: 0.5 # Important but rarely blocking
    monitoring_reviewer: 0.6    # Important for production readiness
  
  conflict_resolution_rules:
    security_vs_performance:
      rule_name: "security_precedence"
      conditions:
        - condition: "security_issue.severity >= 'HIGH'"
          action: "choose_security_recommendation"
        - condition: "performance_impact >= 'CRITICAL' AND security_issue.severity == 'MEDIUM'"
          action: "escalate_to_manual_review"
        - condition: "default"
          action: "choose_security_recommendation"
      
    maintainability_vs_performance:
      rule_name: "balanced_decision"
      conditions:
        - condition: "performance_degradation > 50%"
          action: "choose_performance_recommendation"
        - condition: "maintainability_score < 5.0"
          action: "choose_maintainability_recommendation"
        - condition: "both_impacts_moderate"
          action: "create_hybrid_recommendation"
        - condition: "default"
          action: "escalate_to_stakeholder_input"
    
    testing_vs_delivery_speed:
      rule_name: "minimum_viable_coverage"
      conditions:
        - condition: "critical_path_coverage >= 80%"
          action: "allow_reduced_overall_coverage"
        - condition: "security_related_code_coverage < 90%"
          action: "require_security_test_coverage"
        - condition: "overall_coverage < 60%"
          action: "block_deployment"
        - condition: "default"
          action: "require_75_percent_coverage"
  
  consensus_process:
    1. "collect_all_agent_recommendations()"
    2. "identify_conflicts_by_category_and_file()"
    3. "apply_weighted_scoring_algorithm()"
    4. "execute_conflict_resolution_rules()"
    5. "generate_unified_recommendation_list()"
    6. "calculate_confidence_scores()"
    7. "flag_items_requiring_manual_review()"
    8. "generate_rationale_for_each_decision()"

  output_schema:
    consensus_decisions:
      - recommendation_id: "uuid_v4"
        source_agents: ["agent_list"]
        conflict_detected: false
        final_decision: "implement_recommendation|modify_recommendation|reject_recommendation"
        confidence_score: 0.85
        manual_review_required: false
        rationale: "explanation_of_decision_process"
    
    conflicts_resolved:
      - conflict_id: "uuid_v4"
        conflicting_agents: ["agent_a", "agent_b"]
        conflict_type: "security_vs_performance|maintainability_vs_performance|testing_vs_delivery_speed"
        resolution_rule_applied: "rule_name"
        final_decision: "detailed_decision_explanation"
        confidence_score: 0.70
        stakeholder_input_recommended: true
        alternative_solutions: ["list_of_alternatives"]
    
    manual_review_queue:
      - item_id: "uuid_v4"
        reason: "low_confidence_score|complex_conflict|stakeholder_input_required"
        conflicting_recommendations: ["detailed_recommendations"]
        suggested_reviewer: "senior_architect|security_specialist|team_lead"
        priority: "high|medium|low"
        estimated_resolution_time: "time_estimate"
```

## Error Handling and Recovery System

### Comprehensive Error Handling
```yaml
error_handling_system:
  error_categories:
    cache_errors:
      corrupted_cache_file:
        detection: "checksum_validation|json_parse_error|missing_required_fields"
        action: "restore_from_backup_if_available"
        fallback: "rebuild_cache_from_web_search"
        notification: "warning"
        recovery_time: "2-5_minutes"
      
      cache_lock_timeout:
        detection: "lock_acquisition_timeout"
        action: "retry_with_exponential_backoff"
        max_retries: 3
        backoff_base: 2
        fallback: "proceed_without_cache_with_fresh_searches"
        notification: "warning"
      
      disk_space_insufficient:
        detection: "disk_write_failure|disk_space_check"
        action: "cleanup_old_cache_entries_and_backups"
        fallback: "operate_in_memory_only_mode"
        notification: "error"
        auto_cleanup_threshold: "80%_disk_usage"
      
      network_failure_during_refresh:
        detection: "http_timeout|connection_error|dns_failure"
        action: "use_stale_cache_with_staleness_warning"
        max_stale_tolerance: "72_hours"
        notification: "warning"
        retry_schedule: "exponential_backoff_up_to_6_hours"
    
    agent_execution_errors:
      agent_timeout:
        detection: "execution_time_exceeds_phase_timeout"
        action: "terminate_agent_gracefully"
        impact_assessment: "evaluate_dependent_agents_in_chain"
        fallback: "continue_workflow_with_reduced_capabilities"
        notification: "error"
      
      agent_crash:
        detection: "unhandled_exception|process_termination"
        action: "attempt_single_restart_with_basic_config"
        fallback: "skip_agent_and_update_quality_expectations"
        notification: "critical"
        log_crash_details: true
      
      dependency_data_missing:
        detection: "required_data_not_provided_by_upstream_agent"
        action: "attempt_fallback_analysis_mode"
        fallback: "skip_agent_with_detailed_explanation"
        notification: "warning"
        impact_documentation: "required"
    
    workflow_execution_errors:
      consensus_algorithm_deadlock:
        detection: "conflict_resolution_timeout|circular_dependencies"
        action: "apply_default_conservative_conflict_resolution"
        timeout_seconds: 300
        fallback: "escalate_all_conflicts_to_manual_review"
        notification: "error"
      
      quality_gate_failure:
        detection: "overall_score_below_threshold|blocking_issues_present"
        action: "generate_detailed_failure_report_with_remediation_steps"
        allow_override: "with_explicit_stakeholder_approval"
        notification: "blocking"
        auto_retry: false
      
      configuration_validation_failure:
        detection: "invalid_config_schema|missing_required_fields"
        action: "fall_back_to_default_configuration_with_warnings"
        fallback: "fail_fast_with_detailed_error_message"
        notification: "critical"
        auto_fix_attempts: "basic_config_repair_only"

  recovery_strategies:
    graceful_degradation_policies:
      security_agent_failure:
        action: "apply_conservative_security_defaults_and_flag_for_manual_security_review"
        impact: "reduced_security_confidence_score"
        
      performance_agent_failure:
        action: "skip_performance_optimizations_continue_with_functional_review"
        impact: "no_performance_assessment_in_final_report"
        
      testing_agent_failure:
        action: "require_manual_test_verification_before_deployment"
        impact: "no_automated_test_quality_assessment"
        
      architecture_agent_failure:
        action: "proceed_with_code_level_review_only"
        impact: "no_system_level_architectural_assessment"
        
      documentation_agent_failure:
        action: "flag_documentation_for_manual_review"
        impact: "no_automated_documentation_quality_score"
        
      monitoring_agent_failure:
        action: "recommend_manual_observability_review"
        impact: "no_monitoring_readiness_assessment"
    
    cache_recovery_procedures:
      backup_strategy:
        retention_policy: "keep_3_most_recent_backups_per_category"
        backup_frequency: "before_each_cache_update"
        backup_validation: "checksum_and_structure_verification"
        
      cache_rebuild_triggers:
        - "corruption_detected_with_no_valid_backup"
        - "cache_schema_version_incompatibility"
        - "explicit_admin_request_for_fresh_cache"
        - "cumulative_staleness_exceeds_maximum_threshold"
        
      rebuild_process:
        1. "create_temporary_working_directory"
        2. "fetch_all_categories_fresh_from_web_sources"
        3. "validate_all_fetched_data_integrity"
        4. "build_new_cache_structure_with_checksums"
        5. "atomic_replace_old_cache_with_new_cache"
        6. "verify_new_cache_functionality"
        7. "cleanup_temporary_files"
    
    state_recovery_capabilities:
      checkpoint_strategy:
        frequency: "after_each_successful_phase_completion"
        data_saved: "agent_outputs|cache_state|execution_progress"
        storage_location: ".code_review_cache/.checkpoints"
        retention: "last_3_checkpoints_per_workflow_run"
        
      resume_functionality:
        enabled: true
        resume_granularity: "phase_level"
        state_validation: "comprehensive_integrity_check_before_resume"
        partial_results_handling: "merge_with_previous_results_intelligently"
        
      rollback_capabilities:
        triggers: "critical_error_in_later_phases"
        rollback_granularity: "full_workflow|phase_level"
        data_preservation: "preserve_valid_results_discard_corrupted"
```

## Configuration System (Fixed)

### Adaptive Configuration with Validation
```yaml
workflow_configuration:
  schema_version: "2.1.0"
  configuration_validation:
    enabled: true
    validation_on_startup: true
    schema_file: "workflow_config_schema.json"
    strict_validation: true
    
  execution_settings:
    max_total_duration_minutes: 60    # Reduced from 90 - more realistic
    phase_timeout_buffer_minutes: 2   # Buffer between phases
    parallel_agent_limit: 3           # Max concurrent agents
    enable_early_termination: true    # Stop on critical failures
    checkpoint_frequency: "per_phase"
    resume_capability: true
    
  agent_configuration:
    execution_mode: "adaptive"         # adaptive|strict|minimal|custom
    
    adaptive_mode_settings:
      auto_detect_project_type: true
      project_analysis_timeout: 30     # seconds
      
      project_type_mappings:
        web_application:
          detection_criteria:
            - "package.json with react|vue|angular"
            - "HTML templates present"
            - "CSS/SCSS files present"
            - "API endpoints defined"
          required_agents: ["security_reviewer", "clean_code_reviewer", "performance_reviewer", "testing_reviewer"]
          optional_agents: ["architecture_reviewer", "documentation_reviewer", "monitoring_reviewer"]
          quality_profile: "standard"
          
        microservices:
          detection_criteria:
            - "docker-compose.yml or kubernetes configs"
            - "multiple service directories"
            - "API gateway configuration"
            - "service mesh configuration"
          required_agents: ["security_reviewer", "architecture_reviewer", "monitoring_reviewer", "testing_reviewer"]
          optional_agents: ["clean_code_reviewer", "performance_reviewer", "documentation_reviewer"]
          quality_profile: "strict"
          
        library_package:
          detection_criteria:
            - "setup.py or package.json with library indicators"
            - "extensive test directory"
            - "API documentation"
            - "version management files"
          required_agents: ["clean_code_reviewer", "testing_reviewer", "documentation_reviewer"]
          optional_agents: ["security_reviewer", "performance_reviewer", "architecture_reviewer", "monitoring_reviewer"]
          quality_profile: "standard"
          
        data_pipeline:
          detection_criteria:
            - "data processing frameworks (spark, airflow, etc.)"
            - "ETL/ELT scripts"
            - "data transformation logic"
            - "batch processing indicators"
          required_agents: ["performance_reviewer", "monitoring_reviewer", "testing_reviewer"]
          optional_agents: ["security_reviewer", "clean_code_reviewer", "architecture_reviewer", "documentation_reviewer"]
          quality_profile: "performance_focused"
        
        mobile_application:
          detection_criteria:
            - "iOS/Android project files"
            - "React Native or Flutter"
            - "Mobile-specific dependencies"
            - "App store configuration"
          required_agents: ["security_reviewer", "performance_reviewer", "testing_reviewer"]
          optional_agents: ["clean_code_reviewer", "architecture_reviewer", "documentation_reviewer", "monitoring_reviewer"]
          quality_profile: "mobile_optimized"
    
    manual_agent_selection:
      # Override adaptive mode with explicit agent selection
      enabled_agents: []  # Empty means use adaptive mode
      disabled_agents: [] # Force disable specific agents
      
    agent_capability_matrix:
      security_reviewer:
        can_assess_independently: ["vulnerabilities", "auth_patterns", "data_exposure", "compliance"]
        requires_context_from: []
        provides_context_to: ["testing_reviewer", "architecture_reviewer"]
        critical_for_project_types: ["web_application", "microservices", "mobile_application"]
        
      clean_code_reviewer:
        can_assess_independently: ["naming", "structure", "complexity", "patterns", "maintainability"]
        requires_context_from: []
        provides_context_to: ["performance_reviewer", "testing_reviewer"]
        critical_for_project_types: ["library_package", "web_application"]
        
      performance_reviewer:
        can_assess_independently: ["algorithm_complexity", "resource_usage"]
        requires_context_from: ["clean_code_reviewer"]
        provides_context_to: ["architecture_reviewer", "monitoring_reviewer"]
        critical_for_project_types: ["data_pipeline", "mobile_application", "web_application"]
        
      testing_reviewer:
        can_assess_independently: ["test_coverage_basic"]
        requires_context_from: ["clean_code_reviewer", "security_reviewer"]
        provides_context_to: []
        critical_for_project_types: ["library_package", "microservices", "web_application"]
        
      architecture_reviewer:
        can_assess_independently: ["design_patterns_basic"]
        requires_context_from: ["security_reviewer", "performance_reviewer"]
        provides_context_to: ["documentation_reviewer", "monitoring_reviewer"]
        critical_for_project_types: ["microservices", "data_pipeline"]
        
      documentation_reviewer:
        can_assess_independently: ["documentation_completeness_basic"]
        requires_context_from: ["architecture_reviewer"]
        provides_context_to: []
        critical_for_project_types: ["library_package"]
        
      monitoring_reviewer:
        can_assess_independently: ["basic_logging_check"]
        requires_context_from: ["architecture_reviewer", "performance_reviewer"]
        provides_context_to: []
        critical_for_project_types: ["microservices", "data_pipeline"]
  
  quality_standards:
    # Multiple quality profiles for different use cases
    profiles:
      strict:
        minimum_overall_score: 8.5
        security_score_minimum: 9.0
        test_coverage_minimum: 85
        performance_score_minimum: 8.0
        documentation_score_minimum: 7.5
        blocking_issues_allowed: 0
        warnings_allowed: 5
        
      standard:
        minimum_overall_score: 7.0
        security_score_minimum: 8.0
        test_coverage_minimum: 75
        performance_score_minimum: 7.0
        documentation_score_minimum: 6.0
        blocking_issues_allowed: 0
        warnings_allowed: 10
        
      permissive:
        minimum_overall_score: 6.0
        security_score_minimum: 7.0
        test_coverage_minimum: 60
        performance_score_minimum: 6.0
        documentation_score_minimum: 5.0
        blocking_issues_allowed: 2
        warnings_allowed: 20
        
      performance_focused:
        minimum_overall_score: 7.5
        security_score_minimum: 7.5
        test_coverage_minimum: 70
        performance_score_minimum: 9.0  # Higher performance requirement
        documentation_score_minimum: 5.5
        blocking_issues_allowed: 0
        warnings_allowed: 8
        
      mobile_optimized:
        minimum_overall_score: 7.5
        security_score_minimum: 8.5     # Higher security for mobile
        test_coverage_minimum: 80
        performance_score_minimum: 8.5  # Critical for mobile UX
        documentation_score_minimum: 6.0
        blocking_issues_allowed: 0
        warnings_allowed: 6
    
    active_profile: "standard"
    
    # Dynamic quality gate adjustment based on enabled agents
    conditional_requirements:
      if_security_agent_enabled:
        enforce_security_score_minimum: true
        require_vulnerability_scan: true
        require_security_test_coverage: 90
        
      if_testing_agent_enabled:
        enforce_test_coverage_minimum: true
        require_critical_path_coverage: 90
        require_integration_tests: true
        
      if_performance_agent_enabled:
        enforce_performance_score_minimum: true
        require_performance_regression_check: true
        max_critical_performance_issues: 1
        
      if_documentation_agent_enabled:
        enforce_documentation_score_minimum: true
        require_api_documentation: true
        require_setup_instructions: true
        
      if_architecture_agent_enabled:
        require_architectural_documentation: true
        enforce_design_pattern_compliance: true
        
      if_monitoring_agent_enabled:
        require_logging_implementation: true
        require_health_checks: true
        require_metrics_collection: true
  
  cache_management:
    enabled: true
    cache_directory: ".code_review_cache"
    max_total_size_mb: 100
    backup_retention_days: 7
    compression_enabled: true
    validation_enabled: true
    
    # Intelligent cache warming strategy
    cache_warming:
      enabled: true
      warm_on_first_run: true
      background_refresh_enabled: true
      background_schedule: "daily_at_2am"
      warm_categories_parallel: true
      max_warming_time_minutes: 10
      
    refresh_policies:
      security_standards:
        max_age_hours: 24
        force_refresh_on_high_cve: true
        validation_required: true
        priority: "critical"
        
      clean_code_practices:
        max_age_hours: 720  # 30 days
        validation_required: false
        priority: "standard"
        
      performance_benchmarks:
        max_age_hours: 336  # 14 days
        validation_required: false
        priority: "standard"
        
      testing_frameworks:
        max_age_hours: 720  # 30 days
        validation_required: false
        priority: "standard"
        
      architecture_patterns:
        max_age_hours: 720  # 30 days
        validation_required: false
        priority: "standard"
        
      documentation_standards:
        max_age_hours: 2160  # 90 days
        validation_required: false
        priority: "low"
        
      monitoring_practices:
        max_age_hours: 336  # 14 days
        validation_required: false
        priority: "standard"
    
    # Size management and cleanup
    size_management:
      cleanup_triggers:
        disk_usage_threshold_percent: 80
        cache_age_threshold_days: 90
        unused_threshold_days: 30
        
      cleanup_strategy: "lru_with_priority"  # Least recently used, but consider priority
      emergency_cleanup: "remove_lowest_priority_first"
      
  mcp_tools_configuration:
    enabled_tools: ["cache_manager", "web_search", "context7", "sequential-thinking", "zen:consensus"]
    
    rate_limits:
      web_search: 
        max_per_agent: 15
        max_per_phase: 25
        max_total_workflow: 50
        cooldown_between_searches: 2  # seconds
        
      context7:
        max_per_agent: 10
        max_per_phase: 20
        max_total_workflow: 30
        
      cache_manager:
        unlimited: true  # No rate limiting for cache operations
        
      sequential_thinking:
        max_per_agent: 5
        max_per_workflow: 15
    
    tool_timeouts:
      web_search: 30    # seconds
      context7: 20      # seconds
      cache_manager: 10 # seconds
      sequential_thinking: 45  # seconds
      
    fallback_behavior:
      web_search_timeout: "use_cached_data_if_available"
      context7_timeout: "continue_without_framework_specific_guidance"
      cache_manager_timeout: "proceed_with_fresh_searches_only"
  
  reporting_configuration:
    output_formats: ["json", "markdown", "html"]
    output_directory: "./code_review_reports"
    
    report_components:
      executive_summary: true
      detailed_agent_reports: true
      quality_metrics: true
      recommendation_roadmap: true
      cache_performance_stats: true
      execution_timeline: true
      confidence_scores: true
      
    file_naming:
      summary_report: "review_summary_{timestamp}.json"
      detailed_report: "detailed_review_{timestamp}.md"
      metrics_report: "review_metrics_{timestamp}.json"
      html_dashboard: "review_dashboard_{timestamp}.html"
      
    report_retention:
      max_reports_retained: 10
      cleanup_older_than_days: 30
      
  notification_system:
    enabled: true
    levels: ["critical", "error", "warning", "info"]
    destinations: ["console", "file", "webhook"]
    
    console_output:
      verbosity: "standard"  # minimal|standard|verbose|debug
      colors_enabled: true
      progress_indicators: true
      
    file_logging:
      log_file: "./code_review.log"
      max_log_size_mb: 10
      log_rotation: true
      log_level: "info"
      
    webhook_notifications:
      enabled: false
      url: ""
      events: ["workflow_complete", "critical_error", "quality_gate_failure"]
      retry_attempts: 3

# Advanced Features Configuration
advanced_features:
  performance_monitoring:
    enabled: true
    metrics_collection:
      - "execution_time_per_phase"
      - "cache_hit_ratio"
      - "web_search_efficiency"
      - "agent_success_rate"
      - "memory_usage"
      - "disk_io_operations"
      
    performance_alerts:
      slow_execution_threshold_minutes: 45
      high_memory_usage_threshold_mb: 512
      low_cache_hit_ratio_threshold: 0.6
      
  smart_optimization:
    enabled: true
    learning_from_patterns: true
    
    optimization_strategies:
      cache_prefetching:
        enabled: true
        predictive_warming: true
        usage_pattern_analysis: true
        
      search_deduplication:
        enabled: true
        similarity_threshold: 0.85
        merge_similar_queries: true
        
      agent_parallelization:
        enabled: true
        dynamic_resource_allocation: true
        load_balancing: true
        
  integration_capabilities:
    ci_cd_integration:
      supported_platforms: ["github_actions", "gitlab_ci", "jenkins", "azure_devops"]
      exit_codes:
        success: 0
        warnings_only: 1
        quality_gate_failure: 2
      
      output_formats_for_ci:
        github_actions: "github_annotations"
        gitlab_ci: "gitlab_code_quality_report"
        jenkins: "junit_xml"
        
    ide_integration:
      supported_ides: ["vscode", "intellij", "sublime"]
      real_time_feedback: true
      inline_suggestions: true
      
  extensibility:
    custom_agents:
      enabled: true
      agent_discovery_path: "./custom_agents"
      agent_interface_version: "2.1"
      
    custom_rules:
      enabled: true
      rules_directory: "./custom_rules"
      rule_priorities: "merge_with_defaults"
      
    plugin_system:
      enabled: true
      plugin_directory: "./plugins"
      plugin_api_version: "2.1"

# Final Configuration Validation Schema
configuration_validation:
  schema_enforcement: "strict"
  
  required_sections:
    - "workflow_configuration.execution_settings"
    - "workflow_configuration.agent_configuration"
    - "workflow_configuration.quality_standards"
    - "workflow_configuration.cache_management"
    
  field_constraints:
    max_total_duration_minutes:
      type: "integer"
      minimum: 10
      maximum: 180
      
    parallel_agent_limit:
      type: "integer"
      minimum: 1
      maximum: 7
      
    minimum_overall_score:
      type: "float"
      minimum: 1.0
      maximum: 10.0
      
    cache_max_size_mb:
      type: "integer"
      minimum: 10
      maximum: 1000
      
  validation_on_load: true
  fail_on_invalid_config: true
  auto_fix_minor_issues: true
```

## CLI Interface and Usage

### Complete Command Line Interface
```bash
#!/bin/bash
# Enhanced Multi-Agent Code Review Tool

# Initialize the system with cache setup
code-review init [OPTIONS]
  --profile=<strict|standard|permissive|performance_focused|mobile_optimized>
  --cache-size=<size_in_mb>              # Default: 100
  --agents=<comma_separated_agent_list>   # Optional: force specific agents
  --config-file=<path_to_config>         # Default: ./code_review_config.yaml
  --working-dir=<directory>              # Default: current directory
  --verbose                              # Enable verbose output

# Run comprehensive code review
code-review run [OPTIONS] [TARGET_PATH]
  # Basic execution
  --profile=<profile_name>               # Override config profile
  --agents=<agent_list>                  # Override agent selection
  --timeout=<minutes>                    # Override total timeout
  
  # Cache management during run
  --no-cache                            # Disable all caching
  --force-refresh-cache                 # Force refresh all cached data
  --refresh-cache=<categories>          # Refresh specific cache categories
  --cache-only                          # Use only cached data, no web searches
  
  # Execution control
  --parallel-limit=<number>             # Max parallel agents
  --fail-fast                           # Stop on first critical error
  --continue-on-error                   # Continue despite agent failures
  --resume-from=<phase_name>            # Resume from checkpoint
  --dry-run                             # Simulate without making changes
  
  # Output control
  --format=<json|markdown|html|all>     # Output format
  --output-dir=<directory>               # Output directory
  --quiet                               # Minimal output
  --verbose                             # Detailed output
  --debug                               # Debug level output
  
  # Quality gates
  --fail-on-blocking                    # Exit with error on blocking issues
  --ignore-warnings                     # Don't fail on warnings
  --override-quality-gates              # Allow manual override of quality gates
  
  # Advanced options
  --explain-decisions                   # Show consensus reasoning
  --include-metrics                     # Include performance metrics
  --webhook-url=<url>                   # Send results to webhook
  
# Cache management commands
code-review cache [SUBCOMMAND] [OPTIONS]
  
  # Cache status and information
  cache status                          # Show cache statistics
  cache info --category=<category>      # Show specific category info
  cache list                            # List all cached categories
  
  # Cache maintenance
  cache warm [--categories=<list>]      # Pre-warm cache categories
  cache clean [--older-than=<days>]     # Clean old cache entries
  cache validate [--fix-errors]         # Validate and optionally repair cache
  cache rebuild [--categories=<list>]   # Rebuild specific or all categories
  cache backup                          # Create manual backup
  cache restore --from=<backup_path>    # Restore from backup
  
  # Cache optimization
  cache optimize                        # Optimize cache structure and size
  cache stats                           # Show detailed cache performance stats
  cache usage-report                    # Generate cache usage analysis

# Configuration management
code-review config [SUBCOMMAND] [OPTIONS]
  
  config validate                       # Validate current configuration
  config show                           # Show current configuration
  config show-effective                 # Show resolved configuration with defaults
  config export --format=<yaml|json>   # Export configuration
  config import --file=<config_file>    # Import configuration
  config reset                          # Reset to default configuration
  config migrate --from-version=<ver>   # Migrate config from older version
  config create-template --profile=<profile> # Create config template
  
# Agent management
code-review agents [SUBCOMMAND] [OPTIONS]
  
  agents list                           # List available agents
  agents info --agent=<agent_name>      # Show agent details
  agents test --agent=<agent_name>      # Test specific agent
  agents enable --agents=<list>         # Enable specific agents
  agents disable --agents=<list>        # Disable specific agents
  agents dependencies                   # Show agent dependency graph

# Reporting and analysis
code-review report [SUBCOMMAND] [OPTIONS]
  
  report generate --from-results=<path> # Generate report from previous results
  report compare --baseline=<path>      # Compare with baseline results
  report trends --history-dir=<path>    # Show quality trends over time
  report export --format=<format>       # Export in different formats
  
# System maintenance and debugging
code-review system [SUBCOMMAND] [OPTIONS]
  
  system health                         # Check system health
  system cleanup                        # Clean temporary files and logs
  system version                        # Show version information
  system update                         # Update tool and dependencies
  system diagnostics                    # Run diagnostic tests
  system benchmark                      # Run performance benchmarks

# Integration helpers
code-review integration [SUBCOMMAND] [OPTIONS]
  
  integration github-action             # Generate GitHub Action configuration
  integration pre-commit                # Generate pre-commit hook
  integration ci-config --platform=<ci> # Generate CI/CD configuration
  integration webhook-test --url=<url>  # Test webhook integration

# Examples of common usage patterns:

# First time setup
code-review init --profile=standard --cache-size=100

# Quick security and code quality check
code-review run --agents=security_reviewer,clean_code_reviewer --timeout=15

# Full comprehensive review for production deployment
code-review run --profile=strict --fail-on-blocking --include-metrics

# Review with fresh data (ignore cache)
code-review run --no-cache --agents=security_reviewer,performance_reviewer

# Resume interrupted review
code-review run --resume-from=phase_3_architecture_review

# Performance-focused review for optimization
code-review run --profile=performance_focused --agents=performance_reviewer,monitoring_reviewer

# Generate report from previous run
code-review report generate --from-results=./code_review_reports/review_summary_20250805.json

# Clean up old cache data
code-review cache clean --older-than=30 && code-review cache optimize

# CI/CD integration example
code-review run --profile=strict --format=json --fail-on-blocking --quiet --output-dir=./ci_reports
```

### Environment Variables Support
```bash
# Environment variable configuration
export CODE_REVIEW_CONFIG_FILE="./config/code_review.yaml"
export CODE_REVIEW_CACHE_DIR="./.code_review_cache"
export CODE_REVIEW_OUTPUT_DIR="./reports"
export CODE_REVIEW_LOG_LEVEL="info"
export CODE_REVIEW_PARALLEL_LIMIT="3"
export CODE_REVIEW_TIMEOUT_MINUTES="60"
export CODE_REVIEW_QUALITY_PROFILE="standard"
export CODE_REVIEW_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Cache-specific environment variables
export CODE_REVIEW_CACHE_MAX_SIZE_MB="100"
export CODE_REVIEW_CACHE_WARM_ON_START="true"
export CODE_REVIEW_CACHE_BACKGROUND_REFRESH="true"

# MCP tools configuration
export CODE_REVIEW_WEB_SEARCH_LIMIT="50"
export CODE_REVIEW_CONTEXT7_LIMIT="30"
export CODE_REVIEW_ENABLE_SEQUENTIAL_THINKING="true"

# Integration-specific variables
export CODE_REVIEW_CI_MODE="true"
export CODE_REVIEW_GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export CODE_REVIEW_WEBHOOK_RETRY_ATTEMPTS="3"
```

## Docker Integration
```dockerfile
# Dockerfile for containerized code review
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache git curl bash

# Create app directory
WORKDIR /app

# Install code review tool
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create cache directory with proper permissions
RUN mkdir -p .code_review_cache && \
    chmod 755 .code_review_cache

# Create non-root user
RUN addgroup -g 1001 -S codereviewer && \
    adduser -S codereviewer -u 1001
    
USER codereviewer

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD code-review system health || exit 1

# Default command
ENTRYPOINT ["code-review"]
CMD ["run", "--profile=standard"]

# Docker Compose example
# docker-compose.yml
version: '3.8'
services:
  code-review:
    build: .
    volumes:
      - ./src:/app/src:ro
      - ./cache:/app/.code_review_cache
      - ./reports:/app/reports
    environment:
      - CODE_REVIEW_QUALITY_PROFILE=standard
      - CODE_REVIEW_CACHE_MAX_SIZE_MB=200
      - CODE_REVIEW_PARALLEL_LIMIT=2
    command: ["run", "--format=json", "--output-dir=/app/reports"]
```

## Integration Examples

### GitHub Actions Integration
```yaml
# .github/workflows/code-review.yml
name: Comprehensive Code Review

on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main, develop]

jobs:
  code-review:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history for better analysis
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Setup code review tool
      run: |
        npm install -g enhanced-code-review-tool
        code-review init --profile=strict --cache-size=150
    
    - name: Warm cache for faster execution
      run: code-review cache warm --categories=security_standards,performance_benchmarks
    
    - name: Run comprehensive code review
      run: |
        code-review run \
          --profile=strict \
          --format=json \
          --fail-on-blocking \
          --include-metrics \
          --output-dir=./review-results \
          --webhook-url=${{ secrets.SLACK_WEBHOOK_URL }}
      env:
        CODE_REVIEW_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload review results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: code-review-results
        path: ./review-results/
        
    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const results = JSON.parse(fs.readFileSync('./review-results/review_summary.json', 'utf8'));
          
          const comment = `## 🔍 Code Review Results
          
          **Overall Quality Score:** ${results.executive_summary.overall_quality_score}/10
          **Status:** ${results.executive_summary.deployment_readiness}
          **Critical Issues:** ${results.executive_summary.critical_issues_count}
          
          ### Agent Scores
          ${Object.entries(results.agent_summary).map(([agent, data]) => 
            `- **${agent}**: ${data.score}/10 (${data.critical_issues} critical issues)`
          ).join('\n')}
          
          [View detailed report](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```
