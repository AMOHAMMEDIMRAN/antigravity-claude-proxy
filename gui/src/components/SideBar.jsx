import { useState, useEffect } from "react"
import Button from "./common/Button"
import Dot from "./common/Dot"

const SideBar = ({ onNewChat, onSelectChat, currentChatId }) => {
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState(null)
    const [showAddAccount, setShowAddAccount] = useState(false)
    const [chatHistory, setChatHistory] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchAccounts()
        loadChatHistory()
    }, [])

    const fetchAccounts = async () => {
        try {
            const response = await fetch("http://localhost:8080/accounts")
            const data = await response.json()
            setAccounts(data.accounts || [])
            if (data.accounts && data.accounts.length > 0 && !selectedAccount) {
                setSelectedAccount(data.accounts[0].email)
            }
        } catch (error) {
            console.error("Error fetching accounts:", error)
            setAccounts([])
        }
    }

    const loadChatHistory = () => {
        const saved = localStorage.getItem("chatHistory")
        if (saved) {
            setChatHistory(JSON.parse(saved))
        }
    }

    const saveChatHistory = (chats) => {
        localStorage.setItem("chatHistory", JSON.stringify(chats))
        setChatHistory(chats)
    }

    const handleAddAccount = async () => {
        setLoading(true)
        try {
            const authResponse = await fetch("http://localhost:8080/oauth/start", {
                method: "POST"
            })

            if (!authResponse.ok) {
                throw new Error("Failed to start OAuth flow")
            }

            const { url, state } = await authResponse.json()

            const width = 600
            const height = 700
            const left = (window.screen.width - width) / 2
            const top = (window.screen.height - height) / 2
            const popup = window.open(
                url,
                'Google OAuth',
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
            )

            const pollInterval = setInterval(async () => {
                try {
                    const statusResponse = await fetch(`http://localhost:8080/oauth/status/${state}`)
                    const statusData = await statusResponse.json()

                    if (statusData.status === 'completed') {
                        clearInterval(pollInterval)
                        if (popup && !popup.closed) {
                            popup.close()
                        }
                        await fetchAccounts()
                        setShowAddAccount(false)
                    } else if (statusData.status === 'failed') {
                        clearInterval(pollInterval)
                        if (popup && !popup.closed) {
                            popup.close()
                        }
                        alert(`Authentication failed: ${statusData.error}`)
                    }
                } catch (error) {
                    console.error("Error checking OAuth status:", error)
                }
            }, 1000)

            setTimeout(() => {
                clearInterval(pollInterval)
                if (popup && !popup.closed) {
                    popup.close()
                }
                alert("Authentication timeout. Please try again.")
            }, 120000)

        } catch (error) {
            console.error("Error adding account:", error)
            alert("Failed to start authentication. Make sure the server is running.")
        } finally {
            setLoading(false)
        }
    }

    const handleSelectAccount = (email) => {
        setSelectedAccount(email)
    }

    const handleRemoveAccount = async (accountEmail) => {
        if (window.confirm(`Are you sure you want to remove ${accountEmail}?`)) {
            try {
                const response = await fetch(`http://localhost:8080/accounts/${encodeURIComponent(accountEmail)}`, {
                    method: "DELETE"
                })

                if (response.ok) {
                    await fetchAccounts()
                    if (selectedAccount === accountEmail) {
                        setSelectedAccount(null)
                    }
                } else {
                    const error = await response.json()
                    console.error("Error removing account:", error)
                    alert(`Failed to remove account: ${error.message || "Unknown error"}`)
                }
            } catch (error) {
                console.error("Error removing account:", error)
                alert("Failed to remove account. Make sure the server is running.")
            }
        }
    }

    const handleNewChat = () => {
        const newChat = {
            id: Date.now(),
            title: "New Conversation",
            timestamp: new Date().toISOString(),
            messages: []
        }
        const updatedChats = [newChat, ...chatHistory]
        saveChatHistory(updatedChats)
        onNewChat(newChat)
    }

    const handleDeleteChat = (chatId, e) => {
        e.stopPropagation()
        if (window.confirm("Delete this conversation?")) {
            const updated = chatHistory.filter(chat => chat.id !== chatId)
            saveChatHistory(updated)
        }
    }

    return (
        <div className="h-screen w-[20rem] bg-white border-r-2 border-[#d97757] flex flex-col">
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-200">
                <Button
                    onClick={handleNewChat}
                    className="w-full bg-[#d97757] text-white hover:bg-[#c16647] px-4 py-2 rounded-lg font-medium"
                >
                    + New Chat
                </Button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Chats</h3>
                <div className="space-y-1">
                    {chatHistory.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No chats yet</p>
                    ) : (
                        chatHistory.map((chat) => (
                            <div
                                key={chat.id}
                                className={`p-2 rounded hover:bg-gray-100 cursor-pointer group relative ${currentChatId === chat.id ? 'bg-gray-100' : ''
                                    }`}
                                onClick={() => onSelectChat(chat)}
                            >
                                <div className="text-sm font-medium text-gray-800 truncate pr-6">
                                    {chat.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(chat.timestamp).toLocaleDateString()}
                                </div>
                                <button
                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                    className="absolute right-2 top-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete chat"
                                >
                                    ×
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Accounts Section */}
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">Accounts</h3>
                    <button
                        onClick={() => setShowAddAccount(!showAddAccount)}
                        className="text-[#d97757] hover:text-[#c16647] font-bold text-lg"
                        title="Add Account"
                    >
                        +
                    </button>
                </div>

                {/* Add Account Form */}
                {showAddAccount && (
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2 border border-gray-200">
                        <p className="text-sm text-gray-700">
                            Click to authenticate with your Google account via OAuth.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddAccount}
                                disabled={loading}
                                className="flex-1 bg-[#d97757] text-white text-xs py-2 rounded hover:bg-[#c16647] disabled:bg-gray-300 font-medium"
                            >
                                {loading ? "Authenticating..." : "🔐 Authenticate with Google"}
                            </button>
                            <button
                                onClick={() => setShowAddAccount(false)}
                                className="flex-1 bg-gray-300 text-gray-700 text-xs py-2 rounded hover:bg-gray-400 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Account List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {accounts && accounts.length > 0 && accounts.map((account) => {
                        const isActive = selectedAccount === account.email
                        return (
                            <div
                                key={account.email}
                                className={`p-2 rounded-lg border cursor-pointer transition-all ${isActive
                                        ? "bg-[#d97757] bg-opacity-10 border-[#d97757]"
                                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                    }`}
                                onClick={() => handleSelectAccount(account.email)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Dot variant={isActive ? "green" : "red"} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">
                                                {account.email}
                                            </div>
                                            {account.sessionKey && (
                                                <div className="text-xs text-gray-500 truncate">
                                                    {account.sessionKey.substring(0, 15)}...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveAccount(account.email)
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs font-bold ml-2"
                                        title="Remove Account"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {(!accounts || accounts.length === 0) && (
                    <div className="text-center text-sm text-gray-500 py-4">
                        No accounts added yet
                    </div>
                )}
            </div>
        </div>
    )
}
export default SideBar