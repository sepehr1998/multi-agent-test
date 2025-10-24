const { isLLMConfigured, requestJsonCompletion } = require('./llm');

const joinLines = (lines) => `${lines.join('\n')}\n`;

function bulletList(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return '- Deliver the requested experience';
    }
    return values.map((value) => `- ${value}`).join('\n');
}

async function runAgentWithLLM(agent, { plan, task, rolePrompt }, fallbackFactory) {
    if (!isLLMConfigured()) {
        return fallbackFactory();
    }

    try {
        const result = await requestJsonCompletion({
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: `${agent.name} specialises in ${agent.specialization.toLowerCase()} concerns for frontend projects. Return JSON with keys summary, message, files (object where values are strings), and optional references (array of strings).`,
                },
                {
                    role: 'user',
                    content: joinLines([
                        `Project name: ${plan.projectName}`,
                        `Prompt: ${plan.prompt}`,
                        'Key features:',
                        bulletList(plan.features),
                        '',
                        `Assigned task: ${task.title}`,
                        `Task description: ${task.description}`,
                        '',
                        rolePrompt,
                    ]),
                },
            ],
        });

        if (!result || typeof result !== 'object') {
            throw new Error('LLM response missing JSON payload.');
        }

        const { summary, message, files, references } = result;

        if (!summary || !message || !files || typeof files !== 'object') {
            throw new Error('LLM response missing required fields.');
        }

        return {
            summary,
            message,
            files,
            references: Array.isArray(references) ? references : [],
        };
    } catch (error) {
        console.warn(`${agent.name} falling back to scripted output:`, error.message || error);
        return fallbackFactory();
    }
}

function createArchitectureFallback(plan) {
    const features = plan.features.length ? plan.features : ['Deliver the requested experience'];
    const featureList = bulletList(features);
    const friendlyTimestamp = new Date().toISOString();

    const blueprint = joinLines([
        `# Architecture Blueprint – ${plan.projectName}`,
        '',
        `Generated: ${friendlyTimestamp}`,
        '',
        '## Prompt',
        plan.prompt,
        '',
        '## Key goals',
        featureList,
        '',
        '## Technical stack',
        '- React + Vite',
        '- Modular component directory grouped by responsibility',
        '- Lightweight data model seeded from the orchestration plan',
        '',
        '## Proposed structure',
        '- src/components – presentation components per agent contribution',
        '- src/data – generated prompt metadata shared across the app',
        '- src/styles – global, theme, and responsive layers',
        '- docs – living documentation produced by the specialists',
        '',
        '## Data flow',
        '- App.jsx loads generated metadata from src/data/project.json',
        '- Components receive props to avoid implicit globals',
        '- Styling and responsive layers are separated for clarity',
    ]);

    const pkg = {
        name: plan.slug || 'generated-frontend',
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
            lint: 'eslint "src/**/*.{js,jsx}"',
        },
        dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
        },
        devDependencies: {
            '@vitejs/plugin-react': '^4.2.0',
            vite: '^5.0.0',
        },
    };

    const featureItems = features
        .map((feature) => `                    <li>${feature}</li>`)
        .join('\n');

    const files = {
        'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
        'vite.config.js': joinLines([
            "import { defineConfig } from 'vite';",
            "import react from '@vitejs/plugin-react';",
            '',
            'export default defineConfig({',
            '    plugins: [react()],',
            "    server: { port: 5173 },",
            '});',
        ]),
        'index.html': joinLines([
            '<!doctype html>',
            '<html lang="en">',
            '  <head>',
            '    <meta charset="utf-8" />',
            `    <title>${plan.projectName}</title>`,
            '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
            '  </head>',
            '  <body>',
            '    <div id="root"></div>',
            '    <script type="module" src="/src/main.jsx"></script>',
            '  </body>',
            '</html>',
        ]),
        'src/main.jsx': joinLines([
            "import React from 'react';",
            "import ReactDOM from 'react-dom/client';",
            "import App from './App.jsx';",
            "import './styles/global.css';",
            "import './styles/theme.css';",
            "import './styles/components.css';",
            "import './styles/responsive.css';",
            '',
            "ReactDOM.createRoot(document.getElementById('root')).render(",
            '    <React.StrictMode>',
            '        <App />',
            '    </React.StrictMode>',
            ');',
        ]),
        'src/App.jsx': joinLines([
            "import React from 'react';",
            "import project from './data/project.json';",
            "import ProjectOverview from './components/ProjectOverview.jsx';",
            "import FeatureHighlights from './components/FeatureHighlights.jsx';",
            "import TaskTimeline from './components/TaskTimeline.jsx';",
            "import AgentSummary from './components/AgentSummary.jsx';",
            '',
            'export default function App() {',
            '    return (',
            '        <main className="app-shell">',
            '            <header className="app-header">',
            '                <p className="prompt">{project.prompt}</p>',
            '                <h1>{project.name}</h1>',
            '            </header>',
            '            <div className="layout-grid">',
            '                <ProjectOverview description={project.description} features={project.features} />',
            '                <FeatureHighlights features={project.features} />',
            '                <TaskTimeline tasks={project.tasks} />',
            '                <AgentSummary agents={project.agents} />',
            '            </div>',
            '        </main>',
            '    );',
            '}',
        ]),
        'src/data/project.json': `${JSON.stringify(
            {
                name: plan.projectName,
                prompt: plan.prompt,
                description: `Frontend project generated from the idea "${plan.prompt}"`,
                features,
                tasks: plan.tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    agentId: task.agentId,
                    agentName: task.agentName,
                })),
                agents: plan.tasks.map((task) => ({
                    id: task.agentId,
                    name: task.agentName || task.title,
                    specialization: task.specialization || task.title,
                    task: task.title,
                })),
            },
            null,
            2,
        )}\n`,
        'src/styles/global.css': joinLines([
            ':root {',
            '    color-scheme: light dark;',
            '    font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;',
            '    line-height: 1.5;',
            '    background-color: #0f172a;',
            '    color: #e2e8f0;',
            '}',
            '',
            'body {',
            '    margin: 0;',
            '}',
            '',
            '*, *::before, *::after {',
            '    box-sizing: border-box;',
            '}',
        ]),
        'src/styles/theme.css': '',
        'src/styles/components.css': '',
        'src/styles/responsive.css': '',
        'docs/architecture.md': blueprint,
        'README.md': joinLines([
            `# ${plan.projectName}`,
            '',
            plan.prompt ? `> ${plan.prompt}` : '> Frontend project generated by the swarm system.',
            '',
            '## Getting started',
            '- npm install',
            '- npm run dev',
        ]),
    };

    return {
        summary: `Scaffolded ${plan.projectName} architecture and base files.`,
        message: `Generated Vite project skeleton with data model for ${features.length} key features.`,
        files,
        references: [],
    };
}

function createComponentFallback(plan) {
    const files = {
        'src/components/ProjectOverview.jsx': joinLines([
            "import React from 'react';",
            '',
            'export default function ProjectOverview({ description, features }) {',
            '    return (',
            '        <section className="panel project-overview" aria-labelledby="project-overview-heading">',
            '            <div className="panel-header">',
            '                <h2 id="project-overview-heading">Project overview</h2>',
            '                <p>{description}</p>',
            '            </div>',
            '            <ul className="feature-list">',
            '                {features.map((feature) => (',
            '                    <li key={feature}>{feature}</li>',
            '                ))}',
            '            </ul>',
            '        </section>',
            '    );',
            '}',
        ]),
        'src/components/FeatureHighlights.jsx': joinLines([
            "import React from 'react';",
            '',
            'export default function FeatureHighlights({ features }) {',
            '    return (',
            '        <section className="panel feature-highlights" aria-labelledby="feature-highlights-heading">',
            '            <div className="panel-header">',
            '                <h2 id="feature-highlights-heading">Key features</h2>',
            '                <p>Highlights derived directly from the original idea.</p>',
            '            </div>',
            '            <div className="feature-grid">',
            '                {features.map((feature) => (',
            '                    <article className="feature-card" key={feature}>',
            '                        <h3>{feature}</h3>',
            '                        <p>{`This module ensures the experience delivers on ${feature}.`}</p>',
            '                    </article>',
            '                ))}',
            '            </div>',
            '        </section>',
            '    );',
            '}',
        ]),
        'src/components/TaskTimeline.jsx': joinLines([
            "import React from 'react';",
            '',
            'export default function TaskTimeline({ tasks }) {',
            '    return (',
            '        <section className="panel task-timeline" aria-labelledby="task-timeline-heading">',
            '            <div className="panel-header">',
            '                <h2 id="task-timeline-heading">Implementation timeline</h2>',
            '                <p>Work items generated for this build.</p>',
            '            </div>',
            '            <ol className="task-list">',
            '                {tasks.map((task) => (',
            '                    <li key={task.id} className="task-item">',
            '                        <div>',
            '                            <p className="task-title">{task.title}</p>',
            '                            <p className="task-agent">Assigned to: {task.agentName || task.agentId}</p>',
            '                        </div>',
            '                        <p className="task-description">{task.description}</p>',
            '                    </li>',
            '                ))}',
            '            </ol>',
            '        </section>',
            '    );',
            '}',
        ]),
        'src/components/AgentSummary.jsx': joinLines([
            "import React from 'react';",
            '',
            'export default function AgentSummary({ agents }) {',
            '    return (',
            '        <section className="panel agent-summary" aria-labelledby="agent-summary-heading">',
            '            <div className="panel-header">',
            '                <h2 id="agent-summary-heading">Specialist contributions</h2>',
            '                <p>Each agent focuses on a single discipline to build the project.</p>',
            '            </div>',
            '            <div className="agent-grid">',
            '                {agents.map((agent) => (',
            '                    <article className="agent-card" key={agent.id}>',
            '                        <h3>{agent.name || agent.id}</h3>',
            '                        <p className="agent-role">{agent.specialization}</p>',
            '                        <p className="agent-task">Primary task: {agent.task}</p>',
            '                    </article>',
            '                ))}',
            '            </div>',
            '        </section>',
            '    );',
            '}',
        ]),
        'src/components/index.js': joinLines([
            "export { default as ProjectOverview } from './ProjectOverview.jsx';",
            "export { default as FeatureHighlights } from './FeatureHighlights.jsx';",
            "export { default as TaskTimeline } from './TaskTimeline.jsx';",
            "export { default as AgentSummary } from './AgentSummary.jsx';",
        ]),
    };

    return {
        summary: 'Implemented core React components for overview, features, timeline, and agent summary.',
        message: 'Delivered primary UI components expressing the plan and task data.',
        files,
        references: [],
    };
}

function createStylingFallback(plan) {
    const accent = '#38bdf8';
    const files = {
        'src/styles/theme.css': joinLines([
            ':root {',
            `    --accent: ${accent};`,
            '    --panel-bg: rgba(15, 23, 42, 0.7);',
            '    --panel-border: rgba(148, 163, 184, 0.3);',
            '}',
            '',
            '.app-shell {',
            '    min-height: 100vh;',
            '    padding: 2rem clamp(1rem, 2vw, 3rem);',
            '    background: radial-gradient(circle at top, rgba(56, 189, 248, 0.2), transparent 55%);',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 2rem;',
            '}',
            '',
            '.app-header h1 {',
            '    font-size: clamp(2rem, 4vw, 3rem);',
            '    margin: 0.25rem 0 0;',
            '}',
            '',
            '.app-header .prompt {',
            '    color: rgba(226, 232, 240, 0.7);',
            '    text-transform: uppercase;',
            '    letter-spacing: 0.12em;',
            '    font-size: 0.75rem;',
            '}',
        ]),
        'src/styles/components.css': joinLines([
            '.layout-grid {',
            '    display: grid;',
            '    grid-template-columns: repeat(12, 1fr);',
            '    gap: clamp(1.25rem, 2vw, 2rem);',
            '}',
            '',
            '.panel {',
            '    background: var(--panel-bg);',
            '    border: 1px solid var(--panel-border);',
            '    border-radius: 18px;',
            '    padding: clamp(1.25rem, 2vw, 2rem);',
            '    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);',
            '}',
            '',
            '.panel-header {',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 0.5rem;',
            '    margin-bottom: 1.25rem;',
            '}',
            '',
            '.feature-grid {',
            '    display: grid;',
            '    gap: 1rem;',
            '    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));',
            '}',
            '',
            '.feature-card {',
            '    background: rgba(56, 189, 248, 0.08);',
            '    border-radius: 12px;',
            '    padding: 1rem;',
            '    border: 1px solid rgba(56, 189, 248, 0.24);',
            '}',
            '',
            '.task-list {',
            '    list-style: none;',
            '    margin: 0;',
            '    padding: 0;',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 1rem;',
            '}',
            '',
            '.task-item {',
            '    display: flex;',
            '    flex-direction: column;',
            '    gap: 0.35rem;',
            '}',
            '',
            '.task-title {',
            '    font-weight: 600;',
            '}',
            '',
            '.agent-grid {',
            '    display: grid;',
            '    gap: 1rem;',
            '    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));',
            '}',
            '',
            '.agent-card {',
            '    background: rgba(15, 23, 42, 0.45);',
            '    border: 1px solid rgba(148, 163, 184, 0.25);',
            '    border-radius: 14px;',
            '    padding: 1.25rem;',
            '}',
            '',
            '.agent-role {',
            '    color: rgba(148, 163, 184, 0.85);',
            '    font-size: 0.9rem;',
            '}',
            '',
            '.agent-task {',
            '    margin-top: 0.5rem;',
            '    font-size: 0.85rem;',
            '    color: rgba(226, 232, 240, 0.75);',
            '}',
        ]),
    };

    return {
        summary: 'Applied theme tokens and panel styling inspired by the project brief.',
        message: `Delivered theming layer reflecting the vision for ${plan.projectName}.`,
        files,
        references: [],
    };
}

function createAccessibilityFallback(plan) {
    const files = {
        'docs/accessibility.md': joinLines([
            `# Accessibility Review – ${plan.projectName}`,
            '',
            '## Goals',
            bulletList(plan.features),
            '',
            '## Key actions',
            '- Ensure all sections expose accessible names via headings.',
            '- Provide descriptive text for generated content and data visualisations.',
            '- Maintain a minimum contrast ratio of 4.5:1 for interactive text.',
            '- Keep the layout navigable using keyboard-only interactions.',
            '',
            '## Recommendations',
            '- Verify focus order on dynamically injected panels.',
            '- Validate ARIA landmarks (`main`, `header`, `section`) once components ship.',
            '- Offer alternative descriptions for animations or streamed updates if added later.',
        ]),
    };

    return {
        summary: 'Documented accessibility considerations aligned with the project goals.',
        message: 'Produced accessibility checklist focusing on semantics, contrast, and input methods.',
        files,
        references: [],
    };
}

function createResponsiveFallback(plan) {
    const files = {
        'src/styles/responsive.css': joinLines([
            '@media (max-width: 960px) {',
            '    .layout-grid {',
            '        grid-template-columns: repeat(6, 1fr);',
            '    }',
            '',
            '    .project-overview,',
            '    .feature-highlights,',
            '    .task-timeline,',
            '    .agent-summary {',
            '        grid-column: span 6;',
            '    }',
            '}',
            '',
            '@media (max-width: 640px) {',
            '    .app-shell {',
            '        padding: 1.5rem 1rem;',
            '    }',
            '',
            '    .feature-grid {',
            '        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));',
            '    }',
            '',
            '    .agent-grid {',
            '        grid-template-columns: 1fr;',
            '    }',
            '}',
        ]),
    };

    return {
        summary: 'Added responsive breakpoints for tablet and mobile layouts.',
        message: 'Ensured the layout collapses gracefully across medium and small screens.',
        files,
        references: [],
    };
}

function createPerformanceFallback(plan) {
    const files = {
        'docs/performance.md': joinLines([
            `# Performance Considerations – ${plan.projectName}`,
            '',
            '## Goals',
            bulletList(plan.features),
            '',
            '## Optimisation checklist',
            '- Keep component trees shallow to reduce rerenders.',
            '- Memoise expensive derived data once analytics are introduced.',
            '- Use `React.lazy` and dynamic imports for optional surfaces.',
            '- Audit bundle output with `npm run build -- --stats`. ',
            '- Budget initial render under 100KB of JS.',
            '',
            '## Follow-up tasks',
            '- Implement request caching for remote data when APIs are known.',
            '- Add Core Web Vitals monitoring in production.',
        ]),
    };

    return {
        summary: 'Outlined performance safeguards tailored to the requested experience.',
        message: 'Delivered optimisation checklist to guide future implementation work.',
        files,
        references: [],
    };
}

const architectureAgent = {
    id: 'architecture',
    name: 'Architecture Agent',
    specialization: 'Architecture',
    description: 'Designs the project structure, bootstraps build tooling, and captures the architectural blueprint.',
    createTask(plan) {
        return {
            id: 'architecture-foundation',
            title: `Design the ${plan.projectName} architecture`,
            description: `Create the folder structure, base files, and architectural notes for "${plan.projectName}".`,
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Focus on scaffolding a clean React + Vite project and include architecture documentation.',
            },
            () => createArchitectureFallback(plan),
        );
    },
};

const componentAgent = {
    id: 'components',
    name: 'Component Agent',
    specialization: 'Component Architecture',
    description: 'Implements the core React components that visualise the plan and generated metadata.',
    createTask(plan) {
        return {
            id: 'component-suite',
            title: 'Build the primary component suite',
            description: `Deliver the React components responsible for showcasing the ${plan.features.length} planned features and agent contributions.`,
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Return React component files that visualise the project metadata provided.',
            },
            () => createComponentFallback(plan),
        );
    },
};

const stylingAgent = {
    id: 'styling',
    name: 'Styling Agent',
    specialization: 'Styling',
    description: 'Defines tokens and component styling so the UI reflects the project vision.',
    createTask(plan) {
        return {
            id: 'styling-theme',
            title: 'Apply the visual language',
            description: `Produce theme variables and component styling aligned with the ${plan.projectName} experience.`,
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Generate CSS theme and component layer styling files.',
            },
            () => createStylingFallback(plan),
        );
    },
};

const accessibilityAgent = {
    id: 'accessibility',
    name: 'Accessibility Agent',
    specialization: 'Accessibility',
    description: 'Ensures the experience adheres to WCAG guidance and documents assistive strategies.',
    createTask(plan) {
        return {
            id: 'accessibility-review',
            title: 'Document accessibility guidance',
            description: `Provide accessibility considerations for "${plan.projectName}" based on the requested features.`,
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Summarise accessibility guidance as Markdown suitable for developer hand-off.',
            },
            () => createAccessibilityFallback(plan),
        );
    },
};

const responsiveAgent = {
    id: 'responsive',
    name: 'Responsive Design Agent',
    specialization: 'Responsive Design',
    description: 'Prepares breakpoints and fluid spacing rules so the layout adapts across devices.',
    createTask(plan) {
        return {
            id: 'responsive-layout',
            title: 'Ensure responsive behaviour',
            description: 'Author responsive CSS to keep the generated layout functional on tablets and phones.',
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Create CSS rules that adapt the layout for medium and small viewports.',
            },
            () => createResponsiveFallback(plan),
        );
    },
};

const performanceAgent = {
    id: 'performance',
    name: 'Performance Agent',
    specialization: 'Performance',
    description: 'Reviews the plan for potential performance pitfalls and recommends optimisations.',
    createTask(plan) {
        return {
            id: 'performance-review',
            title: 'Outline performance guardrails',
            description: `Summarise performance best practices to keep ${plan.projectName} fast as it scales.`,
        };
    },
    async act(context) {
        const { plan, task } = context;
        return runAgentWithLLM(
            this,
            {
                plan,
                task,
                rolePrompt: 'Provide a concise Markdown performance checklist tailored to the prompt.',
            },
            () => createPerformanceFallback(plan),
        );
    },
};

const agents = [
    architectureAgent,
    componentAgent,
    stylingAgent,
    accessibilityAgent,
    responsiveAgent,
    performanceAgent,
];

const agentDirectory = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    specialization: agent.specialization,
    description: agent.description,
}));

module.exports = {
    agents,
    agentDirectory,
};
