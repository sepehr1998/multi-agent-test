const fs = require('node:fs/promises');
const path = require('node:path');
const { agents } = require('./agents');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const agentLookup = new Map(agents.map((agent) => [agent.id, agent]));

const defaultPrompt = 'Create a modern, multi-surface frontend experience.';

const capitalise = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'swarm-project';

function extractFeatures(prompt) {
    if (!prompt) {
        return [
            'Deliver the requested experience end-to-end',
            'Design components that reflect the project vision',
            'Document implementation guidance for future work',
        ];
    }

    const condensed = prompt.replace(/\s+/g, ' ').trim();
    const segments = condensed
        .split(/[.?!]/)
        .map((segment) => segment.trim())
        .filter(Boolean);

    if (segments.length === 0) {
        return [capitalise(condensed)];
    }

    return segments.slice(0, 4).map((segment) => capitalise(segment));
}

function createPlan(rawPrompt) {
    const prompt = (rawPrompt || '').trim();
    const nameSource = prompt || 'Swarm collaboration dashboard';
    const cleanedName = nameSource
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const projectName = cleanedName
        .split(' ')
        .slice(0, 6)
        .map((word) => capitalise(word))
        .join(' ')
        || 'Swarm Collaboration Dashboard';

    const plan = {
        id: `plan-${Date.now()}`,
        prompt: prompt || defaultPrompt,
        projectName,
        slug: slugify(projectName),
        features: extractFeatures(prompt),
        tasks: [],
    };

    plan.tasks = agents.map((agent) => {
        if (typeof agent.createTask === 'function') {
            const task = { ...agent.createTask(plan) };
            return {
                ...task,
                agentId: agent.id,
                agentName: agent.name,
                specialization: agent.specialization,
            };
        }
        return {
            id: `${agent.id}-task`,
            agentId: agent.id,
            title: `Contribute ${agent.specialization.toLowerCase()} expertise`,
            description: `Provide ${agent.specialization.toLowerCase()} deliverables for ${plan.projectName}.`,
            agentName: agent.name,
            specialization: agent.specialization,
        };
    });

    return plan;
}

async function materialiseProject({ slug, files }) {
    const baseDir = path.join(process.cwd(), 'projects', `${slug}-${Date.now()}`);
    await fs.mkdir(baseDir, { recursive: true });

    const writeOperations = Object.entries(files).map(async ([relativePath, contents]) => {
        const absolutePath = path.join(baseDir, relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, contents, 'utf8');
    });

    await Promise.all(writeOperations);
    return baseDir;
}

async function runPipeline({ prompt: rawPrompt, emit }) {
    const plan = createPlan(rawPrompt);
    const outputs = {};
    const projectFiles = {};

    await emit({
        agentId: 'orchestrator',
        agentName: 'Swarm Orchestrator',
        specialization: 'Coordinator',
        type: 'plan',
        content: `Created work plan for ${plan.projectName}.`,
        plan,
        timestamp: Date.now(),
    });

    for (const task of plan.tasks) {
        const agent = agentLookup.get(task.agentId);
        if (!agent) {
            continue;
        }

        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'status',
            status: 'started',
            taskId: task.id,
            timestamp: Date.now(),
            content: `${agent.name} picked up task "${task.title}".`,
        });

        const result = await agent.act({ plan, task, prompt: plan.prompt });
        const agentTimeline = outputs[agent.id] || [];
        const timestamp = Date.now();

        agentTimeline.push({
            taskId: task.id,
            summary: result.summary,
            message: result.message,
            files: result.files ? Object.keys(result.files) : [],
            references: result.references || [],
            completedAt: timestamp,
        });
        outputs[agent.id] = agentTimeline;

        if (result.files) {
            for (const [filePath, contents] of Object.entries(result.files)) {
                projectFiles[filePath] = contents;
            }
        }

        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'message',
            taskId: task.id,
            content: result.message || `${agent.name} completed ${task.title}.`,
            details: {
                summary: result.summary,
                files: result.files ? Object.keys(result.files) : [],
                references: result.references || [],
            },
            references: result.references || [],
            timestamp,
        });

        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'status',
            status: 'completed',
            taskId: task.id,
            timestamp: Date.now(),
            content: `${agent.name} completed their ${agent.specialization.toLowerCase()} deliverable.`,
        });

        await sleep(150);
    }

    const finalProject = {
        name: plan.projectName,
        slug: plan.slug,
        prompt: plan.prompt,
        generatedAt: new Date().toISOString(),
        files: projectFiles,
        tasks: plan.tasks,
    };

    try {
        finalProject.directory = await materialiseProject({ slug: plan.slug, files: projectFiles });
    } catch (error) {
        await emit({
            agentId: 'orchestrator',
            agentName: 'Swarm Orchestrator',
            specialization: 'Coordinator',
            type: 'error',
            content: `Failed to write project files: ${error.message}`,
            timestamp: Date.now(),
        });
        throw error;
    }

    await emit({
        agentId: 'orchestrator',
        agentName: 'Swarm Orchestrator',
        specialization: 'Coordinator',
        type: 'summary',
        content: `All ${plan.tasks.length} tasks completed for ${plan.projectName}.`,
        details: {
            planId: plan.id,
            completedTasks: plan.tasks.length,
            contributions: outputs,
        },
        timestamp: Date.now(),
    });

    await emit({
        agentId: 'orchestrator',
        agentName: 'Swarm Orchestrator',
        specialization: 'Coordinator',
        type: 'project',
        content: `Project bundle for ${plan.projectName} is ready.`,
        project: finalProject,
        timestamp: Date.now(),
    });

    return { plan, project: finalProject, outputs };
}

module.exports = { runPipeline };
