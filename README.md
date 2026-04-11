# Smart Testing with AI Agents

## Project Structure

```
SMART-TESTING-WTIH-AI-AGENTS
├── .claude/
│   ├── skills/                      # Claude Code AI skills
│   │   ├── automation/              # Generate Gherkin & test code
│   │   ├── bug-reporting/           # AI-assisted bug reporting
│   │   ├── manual-testing/          # Structured manual testing
│   │   ├── test-charter/            # Generate test charters
│   │   └── ui-test-figma/           # UI vs Figma design comparison
│   └── commands/                    # Claude Code command shortcuts
├── templates/
│   ├── test-charter.md              # Test charter template
│   └── bug-report.md                # Bug report template
├── outputs/                         # Test reports and sample outputs
├── cucumber.cjs                     # Root Cucumber configuration
├── package.json                     # Dependencies and scripts
├── .env                             # Environment configuration (BASE_URL, API_BASE_URL)
└── README.md                        # This file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Smart-testing-with-AI-Agents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## AI-Assisted Testing with Claude Code

This project integrates with [Claude Code](https://claude.com/claude-code) for intelligent test automation. Available skills:

### 1. **Automation** - Generate Test Code
Automatically generate:
- Gherkin feature files
- Cucumber step definitions
- Playwright Page Object Model classes

### 2. **Bug Reporting** - AI-Powered Issue Creation
Create Jira bugs with:
- Automatic screenshot capture
- AI-enhanced descriptions
- Reproduction steps from test execution

### 3. **Manual Testing** - Structured Test Execution
Execute manual tests with:
- Structured test charters
- Browser-based test execution
- Automatic bug filing from findings

### 4. **Test Charter Generation** - Document Test Plans
Generate comprehensive test charters from:
- Manual test execution reports
- Markdown formatted documentation
- Team decision records

### 5. **UI Testing vs Figma** - Design Consistency
Compare live web pages against Figma designs:
- Automatic visual comparison
- Detection of UI inconsistencies
- Design specification validation

## Contributing

This project uses Claude Code skills for intelligent test generation and quality workflows. To contribute:

1. Create feature files describing the test scenarios
2. Use the `/automation` skill to generate step definitions and page objects
3. Use the `/bug-report` skill to file issues found during testing
4. Use the `/test-charter` skill to document test plans
5. Use the `/manual-testing` skill to execute manual tests
6. Use the `/ui-test-figma` skill to Compare live web pages against Figma designs
