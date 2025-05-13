#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First, make sure graphviz is installed
// You'll need to run: npm install graphviz
const packageJson = {
  "name": "flag-dependency-visualizer",
  "version": "1.0.0",
  "description": "Visualize feature flag dependencies",
  "main": "visualize_dependencies.js",
  "dependencies": {
    "graphviz": "^0.0.9"
  }
};

// Function to extract dependencies from the JSON data
function extractDependencies(data) {
  // Dictionary of all flag names
  const allFlagNames = new Set(data.objects.map(item => item.name));
  
  // Collect dependencies
  const dependencies = [];
  
  // Iterate through all flags to find dependencies
  data.objects.forEach(flag => {
    const flagName = flag.name;
    
    // Check for rules with IN_SPLIT matchers
    if (flag.rules) {
      flag.rules.forEach(rule => {
        if (rule.condition && rule.condition.matchers) {
          rule.condition.matchers.forEach(matcher => {
            if (matcher.type === 'IN_SPLIT' && matcher.depends) {
              const dependencyName = matcher.depends.splitName;
              if (allFlagNames.has(dependencyName)) {
                dependencies.push([flagName, dependencyName]);
              }
            }
          });
        }
      });
    }
  });
  
  return dependencies;
}

// Function to create a dependency graph using graphviz
function createDependencyGraph(dependencies, outputFile) {
  let graphviz;
  try {
    graphviz = require('graphviz');
  } catch (e) {
    console.error("Graphviz library not found. Please install it with: npm install graphviz");
    console.error("Additionally, make sure you have the Graphviz system package installed:");
    console.error("  - On macOS: brew install graphviz");
    console.error("  - On Linux: apt-get install graphviz");
    console.error("  - On Windows: Install from https://graphviz.org/download/");
    process.exit(1);
  }
  
  // Create digraph
  const g = graphviz.digraph("G");
  
  // Set graph attributes
  g.set("rankdir", "LR");
  g.set("splines", "true");
  g.set("overlap", "false");
  g.set("fontname", "Arial");
  g.set("fontsize", "14");
  
  // Keep track of nodes added to avoid duplicates
  const addedNodes = new Set();
  
  // Add all dependencies as edges
  dependencies.forEach(([fromFlag, toFlag]) => {
    // Add nodes if they don't already exist
    if (!addedNodes.has(fromFlag)) {
      const fromNode = g.addNode(fromFlag);
      fromNode.set("shape", "box");
      fromNode.set("style", "filled");
      fromNode.set("fillcolor", "lightblue");
      addedNodes.add(fromFlag);
    }
    
    if (!addedNodes.has(toFlag)) {
      const toNode = g.addNode(toFlag);
      toNode.set("shape", "box");
      toNode.set("style", "filled");
      toNode.set("fillcolor", "lightgreen");
      addedNodes.add(toFlag);
    }
    
    // Add the edge
    const edge = g.addEdge(fromFlag, toFlag);
    edge.set("color", "darkblue");
  });
  
  // Generate the graph
  g.output("png", outputFile);
  console.log(`Graph saved to ${outputFile}`);
  
  return { g, addedNodes };
}

// Function to print dependency information
function printDependencyInfo(dependencies) {
  // Count inbound and outbound dependencies
  const inDegree = {};
  const outDegree = {};
  
  dependencies.forEach(([fromFlag, toFlag]) => {
    // Count outbound
    outDegree[fromFlag] = (outDegree[fromFlag] || 0) + 1;
    
    // Count inbound
    inDegree[toFlag] = (inDegree[toFlag] || 0) + 1;
  });
  
  // Create sorted arrays for reporting
  const inDegreeSorted = Object.entries(inDegree)
    .sort((a, b) => b[1] - a[1]);
  
  const outDegreeSorted = Object.entries(outDegree)
    .sort((a, b) => b[1] - a[1]);
  
  console.log(`Total number of flags with dependencies: ${new Set([...dependencies.flat()]).size}`);
  console.log(`Total number of dependencies: ${dependencies.length}`);
  
  // Flags with most dependencies (incoming edges)
  if (inDegreeSorted.length > 0) {
    console.log("\nFlags that most other flags depend on:");
    inDegreeSorted.slice(0, 5).forEach(([flag, count]) => {
      console.log(`  - ${flag}: ${count} dependent flags`);
    });
  }
  
  // Flags depending on most other flags (outgoing edges)
  if (outDegreeSorted.length > 0) {
    console.log("\nFlags that depend on most other flags:");
    outDegreeSorted.slice(0, 5).forEach(([flag, count]) => {
      console.log(`  - ${flag}: depends on ${count} flags`);
    });
  }
}

// Main function
function main() {
  // Load JSON data
  const jsonPath = path.join(__dirname, 'flag_data.json');
  
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Extract dependencies
    const dependencies = extractDependencies(data);
    
    if (dependencies.length === 0) {
      console.log("No dependencies found between flags.");
      return;
    }
    
    // Print dependency information
    printDependencyInfo(dependencies);
    
    // Create package.json if it doesn't exist
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log("Created package.json. Run 'npm install' to install dependencies.");
    }
    
    // Create graph visualization
    const outputFile = path.join(__dirname, 'flag_dependencies.png');
    createDependencyGraph(dependencies, outputFile);
    
    // Also generate a HTML report with more details
    generateHtmlReport(dependencies, data.objects);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Function to generate an HTML report
function generateHtmlReport(dependencies, flags) {
  const flagMap = {};
  flags.forEach(flag => {
    flagMap[flag.name] = flag;
  });
  
  // Create directed adjacency list
  const graph = {};
  dependencies.forEach(([from, to]) => {
    if (!graph[from]) graph[from] = [];
    if (!graph[to]) graph[to] = [];
    graph[from].push(to);
  });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feature Flag Dependencies</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    .card { border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin-bottom: 15px; }
    .flag-name { font-weight: bold; color: #0066cc; }
    .depends-on { color: #cc0000; }
    .depended-by { color: #009900; }
    .table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .table tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Feature Flag Dependencies Report</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <div class="card">
    <p>Total flags with dependencies: ${new Set([...dependencies.flat()]).size}</p>
    <p>Total dependencies: ${dependencies.length}</p>
  </div>
  
  <h2>Flag Dependency Table</h2>
  <table class="table">
    <tr>
      <th>Flag Name</th>
      <th>Depends On</th>
      <th>Depended By</th>
    </tr>
    ${Object.keys(graph).map(flag => {
      const dependsOn = graph[flag];
      const dependedBy = Object.keys(graph).filter(f => graph[f].includes(flag));
      return `
        <tr>
          <td class="flag-name">${flag}</td>
          <td>${dependsOn.length > 0 ? dependsOn.join(', ') : '-'}</td>
          <td>${dependedBy.length > 0 ? dependedBy.join(', ') : '-'}</td>
        </tr>
      `;
    }).join('')}
  </table>
  
  <h2>Detailed Flag Information</h2>
  ${Object.keys(graph).sort().map(flag => {
    const dependsOn = graph[flag];
    const dependedBy = Object.keys(graph).filter(f => graph[f].includes(flag));
    return `
      <div class="card">
        <h3 class="flag-name">${flag}</h3>
        ${flagMap[flag] ? `<p>ID: ${flagMap[flag].id}</p>` : ''}
        
        <h4>Dependencies:</h4>
        ${dependsOn.length > 0 ? `
          <ul>
            ${dependsOn.map(dep => `<li class="depends-on">${dep}</li>`).join('')}
          </ul>
        ` : '<p>No dependencies</p>'}
        
        <h4>Depended by:</h4>
        ${dependedBy.length > 0 ? `
          <ul>
            ${dependedBy.map(dep => `<li class="depended-by">${dep}</li>`).join('')}
          </ul>
        ` : '<p>No other flags depend on this flag</p>'}
      </div>
    `;
  }).join('')}
</body>
</html>
  `;
  
  const htmlPath = path.join(__dirname, 'flag_dependencies_report.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`HTML report saved to ${htmlPath}`);
}

// Run the main function
main();
