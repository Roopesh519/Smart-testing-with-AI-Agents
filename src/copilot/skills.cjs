const skills = [
  {
    id: "qa-agent",
    title: "QA Agent",
    kind: "orchestrator",
    available: true,
    command: "/qa-agent",
    triggers: ["qa agent", "start qa", "run qa", "what can you do", "help me test"],
    needs: [],
  },
  {
    id: "write-acceptance-criteria",
    title: "Write Acceptance Criteria",
    kind: "skill",
    available: true,
    command: "/write-acceptance-criteria",
    triggers: ["acceptance criteria", "write ac", "generate ac"],
    needs: ["jiraCardId"],
  },
  {
    id: "manual-testing",
    title: "Manual Testing",
    kind: "skill",
    available: true,
    command: "Skill: manual-testing",
    triggers: ["manual testing", "run tests", "test card", "do qa"],
    needs: ["jiraCardId", "appUrl"],
  },
  {
    id: "test-charter",
    title: "Test Charter",
    kind: "skill",
    available: true,
    command: "Skill: test-charter",
    triggers: ["test charter", "charter", "publish charter"],
    needs: ["reportPath"],
  },
  {
    id: "ui-test-figma",
    title: "UI Test vs Figma",
    kind: "skill",
    available: true,
    command: "Skill: ui-test-figma",
    triggers: ["figma", "compare design", "ui test", "check design"],
    needs: ["appUrl"],
    optionalNeeds: ["figmaUrl"],
  },
  {
    id: "bug-reporting",
    title: "Bug Reporting",
    kind: "skill",
    available: true,
    command: "Skill: bug-reporting",
    triggers: ["bug report", "file a bug", "log a bug"],
    needs: [],
  },
  {
    id: "automation",
    title: "Automation",
    kind: "skill",
    available: true,
    command: "Skill: automation",
    triggers: ["automation", "gherkin", "playwright", "pom", "step definition", "bdd"],
    needs: ["jiraCardId"],
  },
];

const requiredFieldLabels = {
  jiraCardId: "Jira card ID",
  appUrl: "App URL",
  reportPath: "Report path under outputs/",
  figmaUrl: "Figma URL",
};

module.exports = {
  skills,
  requiredFieldLabels,
};
