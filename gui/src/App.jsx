import { useState } from "react"
import Header from "./components/Header"
import SideBar from "./components/SideBar"
import ChatComponent from "./components/ChatComponent"

const App = () => {
  const [selectedModel, setSelectedModel] = useState("claude-3-5-sonnet-20241022")
  const [currentChat, setCurrentChat] = useState(null)

  const handleNewChat = (chat) => {
    setCurrentChat(chat)
  }

  const handleSelectChat = (chat) => {
    setCurrentChat(chat)
  }

  return (
    <div className="h-screen flex flex-col">
      <Header selectedModel={selectedModel} onModelChange={setSelectedModel} />
      <div className="flex flex-1 overflow-hidden">
        <SideBar
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          currentChatId={currentChat?.id}
        />
        <ChatComponent selectedModel={selectedModel} />
      </div>
    </div>
  )
}
export default App