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

// Assistant can be created via API or UI
const assistantId = ASSISTANT_ID;
const TIMEOUT_MS = 30000; // Timeout set to 30 seconds (adjust as needed)

// Set up a Thread
async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}

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

app.post('/send-message', async (req, res) => {
    try {
        const userMessage = req.body.message;
        console.log('User Message:', userMessage);

        const thread = await createThread();
        console.log('Created Thread:', thread);

        const threadId = thread.id;
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
