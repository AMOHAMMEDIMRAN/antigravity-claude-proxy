import { useState, useRef, useEffect } from "react"
import Button from "./common/Button"

const ChatComponent = ({ selectedModel }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = { role: "user", content: input }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const response = await fetch("http://localhost:8080/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: selectedModel || "claude-3-5-sonnet-20241022",
                    messages: [...messages, userMessage],
                    max_tokens: 4096,
                    stream: false
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error?.message || "Failed to get response")
            }

            const data = await response.json()

            // Extract text content from response
            const assistantContent = data.content
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join("\n")

            setMessages(prev => [...prev, {
                role: "assistant",
                content: assistantContent
            }])

        } catch (error) {
            console.error("Error sending message:", error)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Error: ${error.message}`
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([])
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
                    <p className="text-xs text-gray-500">
                        Model: {selectedModel || "claude-3-5-sonnet-20241022"}
                    </p>
                </div>
                {messages.length > 0 && (
                    <Button
                        onClick={clearChat}
                        variant="outline"
                        className="text-sm"
                    >
                        Clear Chat
                    </Button>
                )}
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500">
                            <p className="text-lg font-medium mb-2">Start a conversation</p>
                            <p className="text-sm">Type a message below to begin</p>
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-3xl rounded-lg p-4 ${message.role === "user"
                                    ? "bg-[#d97757] text-white"
                                    : "bg-white border border-gray-200 text-gray-800"
                                }`}
                        >
                            <div className="text-xs font-semibold mb-1 opacity-70">
                                {message.role === "user" ? "You" : "Assistant"}
                            </div>
                            <div className="whitespace-pre-wrap wrap-break-word">
                                {message.content}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-3xl rounded-lg p-4 bg-white border border-gray-200">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message... (Shift+Enter for new line)"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97757] resize-none"
                        rows={3}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="px-6"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ChatComponent
