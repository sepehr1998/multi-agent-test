const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const agents = [
    {
        id: 'architecture',
        name: 'Architecture Agent',
        specialization: 'Architecture',
        async act({ prompt }) {
            await sleep(250);
            const output = [
                `Architecture Blueprint for "${prompt}"`,
                '',
                'Folder layout:',
                '• src/components – feature oriented React components',
                '• src/hooks – shared logic hooks for data fetching and realtime updates',
                '• src/state – context provider that exposes swarm session data',
                '• src/styles – tokens for color, spacing, and typography',
                '• src/utils – pure helpers for formatting collaboration events',
                '',
                'State management & data flow:',
                '• SwarmProvider (React context) exposes a reducer-based store',
                '• SSE client pushes AgentEvent objects into the store',
                '• Derived selectors feed visualisations (timeline, graph, agent cards)',
                '',
                'Dependency boundaries:',
                '• Visualization widgets consume only the context + hooks',
                '• Networking isolated to hooks/useSwarmStream.js',
                '• Styling tokens consumed via CSS variables or Tailwind config bridge',
            ].join('\n');

            return {
                output,
                message: 'Outlined the frontend architecture, folder structure, and data boundaries.',
                references: [],
            };
        },
    },
    {
        id: 'component',
        name: 'Component Agent',
        specialization: 'Component',
        async act({ prompt, outputs }) {
            await sleep(250);
            const architectureSummary = outputs.architecture ? 'according to the architecture blueprint' : 'based on the product prompt';
            const output = [
                `Component Contracts for "${prompt}"`,
                '',
                'Top-level components:',
                '• AppShell – orchestrates layout regions and provides SwarmProvider',
                '• ControlPanel – form for entering new prompts and managing runs',
                '• AgentStream – subscribes to the SSE feed and renders activity log',
                '• CollaborationGraph – visualises agent-to-agent messaging',
                '• AgentScorecard – shows confidence/mood metrics per agent',
                '',
                'Supporting pieces:',
                '• components/events/EventRow.jsx – renders a single AgentEvent',
                '• components/summary/OutcomePanel.jsx – displays orchestrator summary',
                '• hooks/useSwarmStream.js – handles connection lifecycle',
                '',
                'Data contracts:',
                '• AgentEvent { agentId, agentName, specialization, type, content, references, timestamp, confidence }',
                '• SwarmState { prompt, status, events: AgentEvent[], lastUpdated }',
            ].join('\n');

            return {
                output,
                message: `Proposed React components ${architectureSummary} and defined their data contracts.`,
                references: ['architecture'],
            };
        },
    },
    {
        id: 'styling',
        name: 'Styling Agent',
        specialization: 'Styling',
        async act({ outputs }) {
            await sleep(250);
            const output = [
                'Styling Guidelines',
                '',
                'Design system:',
                '• Base colors – midnight background, electric blue highlights, neutral text',
                '• Typography – use CSS variables (--font-sans, --font-mono) with responsive scaling',
                '• Spacing scale – multiples of 4px converted to rem for consistency',
                '',
                'Implementation notes:',
                '• Create src/styles/tokens.css with CSS custom properties for colors/spacing',
                '• Apply utility-first classes via Tailwind or compiled CSS modules',
                '• Ensure event log rows have alternating subtle backgrounds for readability',
                '• Use accent border-left on active agent cards to emphasise role',
            ].join('\n');

            return {
                output,
                message: 'Established design tokens and styling conventions for the dashboard.',
                references: ['component'],
            };
        },
    },
    {
        id: 'accessibility',
        name: 'Accessibility Agent',
        specialization: 'Accessibility',
        async act({ outputs }) {
            await sleep(250);
            const output = [
                'Accessibility Checklist',
                '',
                'Semantic structure:',
                '• Use <main>, <aside>, and <section> landmarks inside AppShell',
                '• Provide aria-live="polite" region for real-time AgentEvent updates',
                '',
                'Keyboard interaction:',
                '• ControlPanel buttons reachable with logical tab order',
                '• Graph and cards should expose focus rings and skip links',
                '',
                'Assistive feedback:',
                '• Agent cards announce specialization and current status via aria-label',
                '• Provide high-contrast theme toggle for low-vision users',
            ].join('\n');

            return {
                output,
                message: 'Documented WCAG-driven requirements to keep the dashboard accessible.',
                references: ['component', 'styling'],
            };
        },
    },
    {
        id: 'responsive',
        name: 'Responsive Design Agent',
        specialization: 'Responsive Design',
        async act() {
            await sleep(250);
            const output = [
                'Responsive Design Strategy',
                '',
                'Breakpoints:',
                '• 480px – stack control panel above visualization and collapse graph into tabs',
                '• 768px – switch to two-column layout with sticky agent list',
                '• 1280px – enable three-panel layout showing graph, timeline, and summary simultaneously',
                '',
                'Techniques:',
                '• Use CSS grid templates with minmax columns',
                '• Convert event timeline to horizontal scroll area on narrow screens',
                '• Ensure charts recalculate dimensions on resize via ResizeObserver',
            ].join('\n');

            return {
                output,
                message: 'Planned breakpoints and layout strategies for different screen sizes.',
                references: ['styling'],
            };
        },
    },
    {
        id: 'performance',
        name: 'Performance Agent',
        specialization: 'Performance',
        async act({ outputs }) {
            await sleep(250);
            const output = [
                'Performance Recommendations',
                '',
                'Rendering:',
                '• Memoise AgentRow components to avoid unnecessary re-renders during bursts',
                '• Use windowing for long event timelines (react-window or custom virtualization)',
                '',
                'Data handling:',
                '• Batch SSE messages before committing to the store using requestAnimationFrame',
                '• Keep graph computations in web workers to avoid blocking the UI thread',
                '',
                'Tooling:',
                '• Enable React Profiler in development mode for diagnosing regressions',
            ].join('\n');

            return {
                output,
                message: 'Suggested memoization, virtualization, and worker strategies for smooth rendering.',
                references: ['component', 'responsive'],
            };
        },
    },
];

module.exports = { agents };
