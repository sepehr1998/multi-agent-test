const { agents } = require('./agents');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPipeline({ prompt, emit }) {
    const outputs = {};
    const timeline = [];

    for (const agent of agents) {
        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'status',
            status: 'started',
            timestamp: Date.now(),
            content: `${agent.name} is analysing the prompt.`,
        });

        const result = await agent.act({ prompt, outputs, timeline });
        outputs[agent.id] = result.output;
        timeline.push({ agentId: agent.id, output: result.output });

        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'message',
            content: result.message || result.output,
            details: result.output,
            references: result.references || [],
            timestamp: Date.now(),
        });

        await emit({
            agentId: agent.id,
            agentName: agent.name,
            specialization: agent.specialization,
            type: 'status',
            status: 'completed',
            timestamp: Date.now(),
            content: `${agent.name} completed their ${agent.specialization.toLowerCase()} task.`,
        });

        await sleep(150);
    }

    await emit({
        agentId: 'orchestrator',
        agentName: 'Swarm Orchestrator',
        specialization: 'Coordinator',
        type: 'summary',
        content: 'All specialised agents have completed their contributions.',
        details: outputs,
        timestamp: Date.now(),
    });

    return outputs;
}

module.exports = { runPipeline };
