require("dotenv").config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const { OPENAI_API_KEY, ASSISTANT_ID } = process.env;

// Set up OpenAI Client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Use cors middleware
app.use(express.json());

// Assistant can be created via API
const assistantId = ASSISTANT_ID;
const TIMEOUT_MS = 30000; // Timeout set to 30 seconds

// Global variable to store the thread ID
let globalThreadId;

// Create a Thread or return the existing thread ID
async function getOrCreateThread() {
    if (globalThreadId) {
        return globalThreadId;
    } else {
        const thread = await createThread();
        globalThreadId = thread.id;
        return globalThreadId;
    }
}

// Creating a new thread
async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}

//Adding message to thread
async function addMessage(threadId, message) {
    console.log('Adding a new message to thread: ' + threadId);
    const response = await openai.beta.threads.messages.create(
        threadId,
        {
            role: "user",
            content: message
        }
    );
    return response;
}

//Running the assistant
async function runAssistantWithTimeout(threadId) {
    console.log('Running assistant for thread: ' + threadId);
    let assistantResponse;
    try {
        assistantResponse = await Promise.race([
            openai.beta.threads.runs.create(threadId, { assistant_id: assistantId }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS))
        ]);
    } catch (error) {
        console.error('Assistant request timed out or encountered an error:', error);
        throw error; // Rethrow the error for handling in the catch block of the caller
    }
    return assistantResponse;
}

// Open a new thread or return existing thread ID
app.get('/thread', async (req, res) => {
    try {
        const threadId = await getOrCreateThread();
        res.json({ threadId });
    } catch (error) {
        console.error('Error getting or creating thread:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/send-message', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log('User Message:', userMessage);

        const threadId = await getOrCreateThread();
        console.log('Using Thread:', threadId);

        await addMessage(threadId, userMessage);
        console.log('Added Message to Thread');

        let assistantResponse = await runAssistantWithTimeout(threadId);
        console.log('Assistant Response:', assistantResponse);

        // Wait for assistant response to complete
        while (assistantResponse.status !== 'completed') {
            console.log('Assistant Status:', assistantResponse.status);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
            assistantResponse = await openai.beta.threads.runs.retrieve(threadId, assistantResponse.id);
        }

        const messagesList = await openai.beta.threads.messages.list(threadId);
        console.log('Messages List:', messagesList); // Log the entire messagesList object

        const assistantMessage = messagesList.data.find(message => message.role === 'assistant');

        if (assistantMessage && assistantMessage.content) {
            res.json({ message: assistantMessage.content });
        } else {
            console.error('Assistant message not found or content is undefined');
            res.status(500).json({ error: 'No response from assistant' });
        }
    } catch (error) {
        console.error('Error handling user message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
