const { env } = process;

const llmConfig = {
    provider: env.AI_PROVIDER || 'openai',
    apiKey: env.OPENAI_API_KEY || env.AI_API_KEY || '',
    baseUrl: env.OPENAI_BASE_URL || env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: env.OPENAI_MODEL || env.AI_MODEL || 'gpt-4o-mini',
    temperature: Number.parseFloat(env.OPENAI_TEMPERATURE || env.AI_TEMPERATURE || '0.2'),
};

function isLLMConfigured() {
    return Boolean(llmConfig.apiKey);
}

function createHeaders() {
    if (!isLLMConfigured()) {
        throw new Error('No OpenAI-compatible API key found. Set OPENAI_API_KEY before starting the server.');
    }

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmConfig.apiKey}`,
    };

    if (llmConfig.provider === 'azure' && env.AZURE_OPENAI_API_VERSION) {
        headers['api-key'] = llmConfig.apiKey;
        delete headers.Authorization;
    }

    return headers;
}

function buildUrl() {
    if (llmConfig.provider === 'azure') {
        const endpoint = env.AZURE_OPENAI_ENDPOINT || llmConfig.baseUrl;
        const deployment = env.AZURE_OPENAI_DEPLOYMENT || llmConfig.model;
        const apiVersion = env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
        return `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    }

    return `${llmConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;
}

async function requestJsonCompletion({ messages, temperature, schema }) {
    const body = {
        model: llmConfig.model,
        temperature: Number.isFinite(temperature) ? temperature : llmConfig.temperature,
        messages,
    };

    if (schema) {
        body.response_format = { type: 'json_schema', json_schema: schema };
    } else {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch(buildUrl(), {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM request failed: ${response.status} ${response.statusText} – ${errorText}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
        throw new Error('LLM response did not include text content.');
    }

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Failed to parse LLM JSON response: ${(error && error.message) || error}`);
    }
}

module.exports = {
    llmConfig,
    isLLMConfigured,
    requestJsonCompletion,
};
