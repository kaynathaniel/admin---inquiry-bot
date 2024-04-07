const chatInput = document.querySelector(".chat-input textarea");
const sendButton = document.querySelector(".chat-input span");
const chatbox = document.querySelector(".chatbox");
const chatbotToggler = document.querySelector(".chatbot-toggler");
const chatbotCloseBtn = document.querySelector(".close-btn");

const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
  const chatLi = document.createElement("li");
  chatLi.classList.add("chat", className);
  let chatContent;
  if (className === "outgoing") {
    chatContent = `<p>${message}</p><span class="material-symbols-outlined">👤</span>`;
  } else {
    chatContent = `<span class="material-symbols-outlined">🤖</span><p>${message}</p>`;
  }
  chatLi.innerHTML = chatContent;
  return chatLi;
}

const handleChat = async () => {
  userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatInput.value = ''; // Clear input field after sending message

  chatbox.appendChild(createChatLi(userMessage, "outgoing"));
  chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom of chatbox

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

    //show loading sign

    const responseData = await response.json();
    const assistantMessage = responseData.message;

    //hide loading sign

    chatbox.appendChild(createChatLi(assistantMessage[0].text.value, "incoming"));
    chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom after assistant response
  } catch (error) {

    //hide loading sign

    console.error('Error handling assistant response:', error);
    const errorMessage = 'Oops! Something went wrong. Please try again.';
    chatbox.appendChild(createChatLi(errorMessage, "incoming"));
    chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom after error message
  }
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
