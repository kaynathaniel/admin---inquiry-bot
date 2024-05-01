const chatInput = document.querySelector(".chat-input textarea");
const sendButton = document.querySelector(".chat-input span");
const chatbox = document.querySelector(".chatbox");
const chatbotToggler = document.querySelector(".chatbot-toggler");
const chatbotCloseBtn = document.querySelector(".close-btn");

const inputInitHeight = chatInput.scrollHeight;

// Function to generate a timestamp string
const generateTimestamp = () => {
  const now = new Date();
  return now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

// Function to create the initial welcome message with timestamp
const createWelcomeMessage = () => {
  const welcomeMessage = "Welcome! 👋 <br> My name is Inquiro, How may I assist you today?";
  const timestamp = generateTimestamp();
  return createChatLi(welcomeMessage, "incoming", timestamp);
}

// Function to create a chat message element with timestamp
const createChatLi = (message, className, timestamp) => {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);

  let chatContent;
  if (className === "outgoing") {
    chatContent = `<p>${message}<br><span class="timestamp">${timestamp}</span></p><span class="material-symbols-outlined">👤</span>`;
  } else {
    chatContent = `<span class="material-symbols-outlined">🤖</span><p>${message}<br><span class="timestamp">${timestamp}</span></p>`;
  }

  chatLi.innerHTML = chatContent;
  return chatLi;
}


// Function to handle sending a message and receiving a response
const handleChat = async () => {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatInput.value = ''; // Clear input field after sending message

  appendMessage(createChatLi(userMessage, "outgoing", generateTimestamp()));

  // Display "Thinking..." message
  appendMessage(createChatLi("Thinking...", "incoming", generateTimestamp()));

  try {
    const response = await fetch('http://localhost:3000/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: userMessage })
    });

    if (!response.ok) {
      throw new Error('Failed to get assistant response');
    }

    const responseData = await response.json();
    const assistantMessage = responseData.message;

    // Remove "Thinking..." message
    removeLastMessage();

    appendMessage(createChatLi(assistantMessage[0].text.value, "incoming", generateTimestamp()));
  } catch (error) {

    // Remove "Thinking..." message
    removeLastMessage();

    console.error('Error handling assistant response:', error);
    const errorMessage = 'Oops! Something went wrong. Please try again.';
    appendMessage(createChatLi(errorMessage, "incoming", generateTimestamp()));
    const errorLi = chatbox.lastChild.querySelector('p');
    if (errorLi) errorLi.classList.add('error'); // Add error class to <p> tag
  }

  scrollToBottom();
}

// Function to append a message to the chatbox
const appendMessage = (messageElement) => {
  chatbox.appendChild(messageElement);
}

// Function to remove the last message from the chatbox
const removeLastMessage = () => {
  chatbox.removeChild(chatbox.lastChild);
}

// Function to scroll to the bottom of the chatbox
const scrollToBottom = () => {
  chatbox.scrollTop = chatbox.scrollHeight;
}

chatInput.addEventListener("input", () => {
  chatInput.style.height = `${inputInitHeight}px`;
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

sendButton.addEventListener("click", handleChat);

chatbotCloseBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleChat();
  }
});

// Initialize chat with welcome message
appendMessage(createWelcomeMessage());
