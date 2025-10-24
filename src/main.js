const { createServer } = require('node:http');
const { runPipeline } = require('./orchestrator');

function writeSse(res, event) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function handleStream(req, res) {
    const prompt = new URL(req.url, `http://${req.headers.host}`).searchParams.get('prompt')
        || 'Build a dashboard to visualise specialised swarm collaboration.';

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    res.write(': connected\n\n');

    let closed = false;
    req.on('close', () => {
        closed = true;
    });

    const emit = async (event) => {
        if (closed) {
            return;
        }
        writeSse(res, event);
    };

    try {
        await runPipeline({ prompt, emit });
        if (!closed) {
            res.write('event: done\n');
            res.write('data: {}\n\n');
            res.end();
        }
    } catch (error) {
        if (!closed) {
            writeSse(res, {
                agentId: 'orchestrator',
                agentName: 'Swarm Orchestrator',
                specialization: 'Coordinator',
                type: 'error',
                content: error.message,
                timestamp: Date.now(),
            });
            res.end();
        }
    }
}

const server = createServer((req, res) => {
    if (req.url.startsWith('/swarm/stream')) {
        handleStream(req, res);
        return;
    }

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(
        'Multi-agent swarm server online. Connect to /swarm/stream?prompt=Your+idea to stream collaboration events.',
    );
});

const hostname = '127.0.0.1';
const port = 3000;

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
