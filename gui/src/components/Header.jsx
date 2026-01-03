import { useEffect, useState } from "react"
import Dot from "./common/Dot"

const Header = ({ selectedModel, onModelChange }) => {
    const [models, setModels] = useState([]);
    const [systemStatus, setSystemStatus] = useState("red");

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch("http://localhost:8080/v1/models");
                const data = await response.json();
                const modelList = data.data || data;
                setModels(modelList);
                console.log("Models:", modelList);
            } catch (error) {
                console.error("Error fetching models:", error);
            }
        }
        fetchModels();
    }, [])

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const health = await fetch("http://localhost:8080/health");
                const data = await health.json();
                console.log(data.status)
                setSystemStatus(data.status === "ok" ? "green" : "red");
            } catch (error) {
                setSystemStatus("red");
            }
        }
        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, [])

    const handleModelChange = (e) => {
        onModelChange(e.target.value);
        console.log("Selected model:", e.target.value);
    }

    return (
        <div className="bg-[#d97757] py-4 ">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 ">
                        <Dot variant={systemStatus} />
                        <h1 className="font-fair text-xl text-[#30302e] font-semibold ">Antigravity Claude Proxy GUI</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="models" className="text-[#30302e] font-medium">Select Model:</label>
                        <select
                            name="models"
                            id="models"
                            value={selectedModel}
                            onChange={handleModelChange}
                            className="px-3 py-1 rounded border border-[#30302e] bg-white text-[#30302e] focus:outline-none focus:ring-2 focus:ring-[#30302e]"
                        >
                            <option value="">Choose a model...</option>
                            {models.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.id}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Header