const { isLLMConfigured, requestJsonCompletion } = require('./llm');

const joinLines = (lines) => `${lines.join('\n')}\n`;

const bulletList = (items) =>
    items && items.length ? items.map((item) => `- ${item}`).join('\n') : '- Align the deliverable with the product vision';

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
                    content: joinLines([
                        `${agent.name} specialises exclusively in ${agent.specialization.toLowerCase()}.`,
                        'Stay within that domain while collaborating with the other specialists.',
                        'Return JSON with keys summary, message, files (object of path -> string), and optional references (array of strings).',
                    ]),
                },
                {
                    role: 'user',
                    content: joinLines([
                        `Project name: ${plan.projectName}`,
                        `Prompt: ${plan.prompt}`,
                        'Key goals:',
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
        console.warn(`${agent.name} falling back to blueprint output:`, error.message || error);
        return fallbackFactory();
    }
}

function blueprintFallback(agent, plan, sections) {
    const timestamp = new Date().toISOString();
    const docSections = sections
        .map(({ heading, bullets }) => joinLines([`## ${heading}`, '', bulletList(bullets), '']))
        .join('');

    return {
        summary: `${agent.name} recorded a blueprint because no AI provider is configured.`,
        message: `${agent.name} requires a configured LLM to deliver concrete assets. A blueprint has been stored for operators to review.`,
        files: {
            [`docs/${agent.id}-blueprint.md`]: joinLines([
                `# ${agent.name} Blueprint`,
                '',
                `Project: ${plan.projectName}`,
                `Prompt: ${plan.prompt}`,
                `Generated: ${timestamp}`,
                '',
                docSections || '## Guidance\n\n- Awaiting detailed output once an AI provider is configured.\n',
                '## Next steps when AI is available',
                '',
                '- Configure OPENAI_API_KEY (or compatible provider) before rerunning the pipeline.',
                '- Re-run the swarm to obtain full deliverables.',
            ]),
        },
        references: [],
    };
}

function createAgent(config) {
    return {
        id: config.id,
        name: config.name,
        specialization: config.specialization,
        description: config.description,
        createTask(plan) {
            return {
                id: `${config.id}-task`,
                title: config.taskTitle,
                description: config.taskDescription,
            };
        },
        async act(context) {
            return runAgentWithLLM(
                this,
                {
                    plan: context.plan,
                    task: context.task,
                    rolePrompt: config.rolePrompt,
                },
                () => blueprintFallback(this, context.plan, config.fallbackSections(context.plan)),
            );
        },
    };
}

const agents = [
    createAgent({
        id: 'architecture',
        name: 'Architecture Agent',
        specialization: 'Architecture',
        description: 'Defines the technical vision, stack selection, and solution boundaries for each project.',
        taskTitle: 'Establish the technical architecture',
        taskDescription:
            'Analyse the product goals and outline the technical stack, project structure, state management, and integration approach.',
        rolePrompt: joinLines([
            'You are responsible for the overall frontend architecture of this new project.',
            'Analyse the product idea and propose the most appropriate tooling, runtime, and project structure.',
            'Document state management, data flow, integration boundaries, and quality considerations.',
            'Provide outputs such as architecture briefs, decision records, or configuration stubs that the other agents can follow.',
            'Only include executable code when it is essential to express the architecture.',
        ]),
        fallbackSections: (plan) => [
            {
                heading: 'Architecture Priorities',
                bullets: [
                    'Select a frontend stack that matches the product vision and team capabilities.',
                    'Define how data flows through the application and how state is managed.',
                    'Identify critical integration points, build tooling, and quality gates.',
                ],
            },
            {
                heading: 'Information Needed from Prompt',
                bullets: plan.features,
            },
        ],
    }),
    createAgent({
        id: 'component',
        name: 'Component Agent',
        specialization: 'Component Implementation',
        description: 'Builds the application, wiring together views, routing, data handling, and interactions.',
        taskTitle: 'Deliver the working user interface',
        taskDescription:
            'Produce all application source files required to run the experience end-to-end, respecting the architectural direction.',
        rolePrompt: joinLines([
            'You implement the working frontend for this project.',
            'Select the framework, libraries, and project scaffolding that best fit the product requirements and architectural guidance.',
            'Deliver complete, production-ready source files including package manifests, build configuration, entry points, and feature components.',
            'Avoid redundant placeholders—implement meaningful behaviour that reflects the prompt.',
            'Coordinate with other agents by exposing clear component boundaries and documentation.',
        ]),
        fallbackSections: (plan) => [
            {
                heading: 'Implementation Goals',
                bullets: [
                    'Generate a runnable application once an AI provider is configured.',
                    'Translate the product story into routes, components, and supporting utilities.',
                    'Surface shared data structures that other specialists can extend.',
                ],
            },
            {
                heading: 'Awaiting Execution',
                bullets: [
                    'The component agent will create the full project scaffold when the LLM is available.',
                ],
            },
        ],
    }),
    createAgent({
        id: 'styling',
        name: 'Styling Agent',
        specialization: 'Styling',
        description: 'Owns the design system, visual language, and aesthetic implementation for the project.',
        taskTitle: 'Establish the design system and visual styling',
        taskDescription:
            'Create design tokens, global styles, and component-level treatments that reflect the prompt and complement the architecture.',
        rolePrompt: joinLines([
            'You are responsible for visual design implementation.',
            'Define or extend the design system, including tokens, typography, colour schemes, and spacing conventions.',
            'Update component files or author stylesheets to apply the design language consistently.',
            'Do not alter core application logic—limit your changes to styling concerns.',
        ]),
        fallbackSections: () => [
            {
                heading: 'Styling Blueprint',
                bullets: [
                    'Establish a coherent visual language informed by the product goals.',
                    'Document key tokens such as colour, typography, spacing, and elevation.',
                    'Annotate components with styling responsibilities for when generation is available.',
                ],
            },
        ],
    }),
    createAgent({
        id: 'accessibility',
        name: 'Accessibility Agent',
        specialization: 'Accessibility',
        description: 'Ensures the experience complies with accessibility standards and inclusive design practices.',
        taskTitle: 'Guarantee accessibility and inclusive behaviours',
        taskDescription:
            'Audit the interface for accessibility requirements and update markup, labelling, and interaction patterns accordingly.',
        rolePrompt: joinLines([
            'You own accessibility for this project.',
            'Review the implementation for semantic correctness, keyboard support, focus management, and assistive technology compatibility.',
            'Modify components or author guidance to meet WCAG 2.1 AA expectations.',
            'Document any trade-offs or follow-up tasks.',
        ]),
        fallbackSections: () => [
            {
                heading: 'Accessibility Checklist',
                bullets: [
                    'Ensure semantic HTML structures and accessible naming.',
                    'Validate keyboard and screen reader interaction patterns.',
                    'Capture testing recommendations for future verification.',
                ],
            },
        ],
    }),
    createAgent({
        id: 'responsive',
        name: 'Responsive Design Agent',
        specialization: 'Responsive Design',
        description: 'Makes sure the layout adapts gracefully across breakpoints and device capabilities.',
        taskTitle: 'Deliver responsive layout strategies',
        taskDescription:
            'Ensure the interface works across screen sizes, orientations, and input modes, adjusting layout rules as needed.',
        rolePrompt: joinLines([
            'You manage responsive behaviour for this project.',
            'Define breakpoint strategies, fluid spacing, and adaptive patterns that honour the brand and content priorities.',
            'Adjust style sheets or components to realise the responsive intent without rewriting core logic.',
            'Provide documentation for testing across devices.',
        ]),
        fallbackSections: () => [
            {
                heading: 'Responsive Strategy Notes',
                bullets: [
                    'Identify critical breakpoints and layout adjustments tied to the prompt.',
                    'Outline how components should rearrange or scale.',
                    'Document device testing priorities.',
                ],
            },
        ],
    }),
    createAgent({
        id: 'performance',
        name: 'Performance Agent',
        specialization: 'Performance',
        description: 'Optimises runtime, loading, and rendering characteristics for the finished experience.',
        taskTitle: 'Optimise performance and delivery',
        taskDescription:
            'Analyse the implementation for performance risks and deliver optimisations, instrumentation, and best-practice guidance.',
        rolePrompt: joinLines([
            'You are accountable for performance.',
            'Profile the proposed implementation and recommend optimisations for loading, rendering, and data access.',
            'Provide code adjustments, build configuration, or documentation that improves performance budgets.',
            'Avoid changes unrelated to performance characteristics.',
        ]),
        fallbackSections: () => [
            {
                heading: 'Performance Blueprint',
                bullets: [
                    'Establish budgets for loading, interaction, and runtime metrics.',
                    'Plan for instrumentation and monitoring hooks.',
                    'Identify potential bottlenecks once the implementation exists.',
                ],
            },
        ],
    }),
];

const agentDirectory = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    specialization: agent.specialization,
    description: agent.description,
}));

module.exports = { agents, agentDirectory };
