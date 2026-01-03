import { useState, useRef, useEffect } from "react"
import Button from "./common/Button"

const ChatComponent = ({ selectedModel }) => {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])
    const messagesEndRef = useRef(null)
    const fileInputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = error => reject(error)
        })
    }

    // Handle file selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))

        if (imageFiles.length !== files.length) {
            alert('Only image files are supported')
        }

        setSelectedFiles(prev => [...prev, ...imageFiles])
    }

    // Remove selected file
    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    // Clean markdown formatting from response
    const cleanMarkdownFormatting = (text) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
            .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
            .replace(/`(.+?)`/g, '$1')        // Remove inline code `text`
            .replace(/^\s*[-*]\s+/gm, '• ')   // Convert markdown bullets to •
            .replace(/^#+\s+/gm, '')          // Remove heading markers
            .trim()
    }

    const sendMessage = async () => {
        if ((!input.trim() && selectedFiles.length === 0) || isLoading) return

        // Build message content
        const messageContent = []

        // Add images first
        for (const file of selectedFiles) {
            try {
                const base64Data = await fileToBase64(file)
                messageContent.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: file.type,
                        data: base64Data
                    }
                })
            } catch (error) {
                console.error('Error converting file:', error)
                alert(`Failed to process ${file.name}`)
                return
            }
        }

        // Add text if present
        if (input.trim()) {
            messageContent.push({
                type: 'text',
                text: input
            })
        }

        const userMessage = {
            role: "user",
            content: messageContent,
            displayText: input || `[${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''}]`
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setSelectedFiles([])
        setIsLoading(true)

        try {
            // Build API messages - convert complex content back to simple format for previous messages
            const apiMessages = messages.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : msg.content
            }))

            const response = await fetch("http://localhost:8080/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: selectedModel || "claude-sonnet-4-5-thinking",
                    messages: [...apiMessages, { role: userMessage.role, content: userMessage.content }],
                    max_tokens: 4096,
                    stream: false
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error?.message || "Failed to get response")
            }

            const data = await response.json()

            // Extract text content from response and clean formatting
            const assistantContent = data.content
                .filter(block => block.type === "text")
                .map(block => cleanMarkdownFormatting(block.text))
                .join("\n")

            setMessages(prev => [...prev, {
                role: "assistant",
                content: assistantContent,
                displayText: assistantContent
            }])

        } catch (error) {
            console.error("Error sending message:", error)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Error: ${error.message}`,
                displayText: `Error: ${error.message}`
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
        setSelectedFiles([])
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Chat</h2>
                    <p className="text-xs text-gray-500">
                        Model: {selectedModel || "claude-sonnet-4-5-thinking"}
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
                            <p className="text-sm">Type a message or upload an image to begin</p>
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
                            {message.role === "user" && Array.isArray(message.content) && (
                                <div className="space-y-2">
                                    {message.content.filter(c => c.type === 'image').map((img, i) => (
                                        <div key={i} className="mb-2">
                                            <img
                                                src={`data:${img.source.media_type};base64,${img.source.data}`}
                                                alt="Uploaded"
                                                className="max-w-full rounded border border-white/30"
                                                style={{ maxHeight: '200px' }}
                                            />
                                        </div>
                                    ))}
                                    {message.content.filter(c => c.type === 'text').map((txt, i) => (
                                        <div key={i} className="whitespace-pre-wrap wrap-break-word">
                                            {txt.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(message.role === "assistant" || typeof message.content === "string") && (
                                <div className="whitespace-pre-wrap wrap-break-word">
                                    {message.displayText || message.content}
                                </div>
                            )}
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
                <div className="max-w-4xl mx-auto">
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="h-20 w-20 object-cover rounded border border-gray-300"
                                    />
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            disabled={isLoading}
                            className="px-4"
                            title="Upload images"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                        </Button>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your message or upload images... (Shift+Enter for new line)"
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d97757] resize-none"
                            rows={3}
                            disabled={isLoading}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
                            className="px-6"
                        >
                            Send
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChatComponent
