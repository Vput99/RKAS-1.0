---
name: csv-utils
description: Utilities for reading, writing, and manipulating CSV files for FiftyOne datasets.
---

# CSV Utilities Skill

This skill provides an automated way to handle CSV data within the FiftyOne ecosystem.

## Overview
Automates CSV importing, exporting, and summarization tasks.

## Key Directives
- ALWAYS verify CSV header compatibility with FiftyOne fields.
- NEVER overwrite existing CSV files without confirmation.
- ALWAYS use UTF-8 encoding for CSV operations.

## Workflow
1. **Identify Source**: Locate the CSV file or FiftyOne dataset.
2. **Analysis**: Read the first few lines to determine the schema.
3. **Action**: Perform requested operation (import/export/summarize).
4. **Verification**: Confirm the operation succeeded by checking the target.

## Troubleshooting
- **Error: Column Mismatch**: Ensure the CSV headers match the dataset field names.
- **Error: Encoding**: Verify the file is in UTF8 format.
