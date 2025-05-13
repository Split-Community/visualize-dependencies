# Feature Flag Dependency Visualizer

A Node.js utility to visualize and analyze dependencies between feature flags in a Split.io configuration.

## Overview

This tool analyzes feature flag configurations to identify dependencies where a flag has a matcher of type 'IN_SPLIT', and the splitName referenced in the depends object matches the name of another feature flag in the system.

## Features

- 📊 **Dependency Graph**: Generates a visual graph showing flag dependencies using Graphviz
- 📝 **HTML Report**: Creates a detailed HTML report with dependency relationships
- 📋 **Dependency Analysis**: Shows which flags are most depended upon and which flags depend on others

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) installed on your system.

2. Clone or download this repository.

3. Install Node.js dependencies:
   ```
   npm install
   ```

4. Install [Graphviz](https://graphviz.org/download/) on your system:
   - On macOS: `brew install graphviz`
   - On Linux: `apt-get install graphviz`
   - On Windows: Download from [Graphviz website](https://graphviz.org/download/)

## Usage

1. Place your `flag_data.json` file (containing the Split.io feature flag configurations) in the same directory as the script. You can retrieve this using the admin api's endpoint to [list feature flag definitions](https://docs.split.io/reference/list-feature-flag-definitions-in-environment)

2. Run the script:
   ```
   node visualize_dependencies.js
   ```

3. Two output files will be generated:
   - `flag_dependencies.png`: A visualization of the flag dependencies
   - `flag_dependencies_report.html`: A detailed HTML report showing all dependencies

## Understanding the Output

### Dependency Graph

The graph visualization shows:
- Blue nodes: Flags that depend on other flags
- Green nodes: Flags that are depended upon
- Arrows: Direction of dependency (from dependent flag to dependency)

### Console Output

The tool prints summary information to the console, including:
- Total count of flags with dependencies
- Total number of dependency relationships
- Flags that are most depended upon by other flags
- Flags that depend on the most other flags

### HTML Report

The HTML report provides:
- Summary statistics
- A table view of all dependencies
- Detailed cards for each flag showing:
  - Flag ID
  - Flags it depends on
  - Flags that depend on it

## How Dependencies Are Identified

A dependency is considered to exist when:
1. A feature flag has a rule with a matcher of type 'IN_SPLIT'
2. The matcher's `depends.splitName` property matches the name of another flag in the dataset

## Example visual output
![image](https://github.com/user-attachments/assets/79d0d55b-e945-464b-8f31-69a09b07617f)


## Contributing

Contributions are welcome! Feel free to submit a Pull Request.
