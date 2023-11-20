import "./App.css"
import Sidebar from "./components/Sidebar.jsx"
import MainContent from "./components/MainContent.jsx"
import TransferModal from "./components/TransferModal.jsx"
import React, { useEffect, useState } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { ThemeContext } from "./components/ThemeContext.jsx"
import { checkForResync, finishAuth } from "./components/js/cloudSyncing.js"
import Toast from "./components/Toast.jsx"
import { getObject, setObject } from "./components/js/utils.js"

function App() {
    const { theme } = React.useContext(ThemeContext)

    const [prompts, setPrompts] = useLocalStorage("prompts", [])
    const [folders, setFolders] = useLocalStorage("folders", [])

    const tags = prompts.length > 0 ? new Set(prompts.flatMap(obj => obj.tags)) : []

    const [filteredPrompts, setFilteredPrompts] = useState(prompts)
    const [selectedFolder, setSelectedfolder] = useState("")
    const [filterTags, setFilterTags] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [toast, setToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")

    const cloudSyncing = getObject("cloudSyncing", false)
    if (cloudSyncing) {
        checkForResync()
    }

    // get the "transfer" URL parameter
    const transferring = new URLSearchParams(window.location.search).get("transfer") ?? false

    function filterPrompts(folder = "", tags = [], searchTerm = "") {
        let newFiltered = prompts
        if (tags.length > 0) {
            newFiltered = newFiltered.filter(prompt => {
                // Check if all tags in the filterTags array are included in each prompt's tags array
                return tags.every(filterTag => prompt.tags.includes(filterTag))
            })
        }

        if (folder !== "") {
            newFiltered = newFiltered.filter(obj => obj.folder === folder)
        }

        if (searchTerm !== "") {
            searchTerm = searchTerm.toLowerCase() // convert search term to lowercase
            newFiltered = newFiltered.filter(
                prompt =>
                    prompt.text?.toLowerCase().includes(searchTerm) ||
                    prompt.description?.toLowerCase().includes(searchTerm) ||
                    prompt.title?.toLowerCase().includes(searchTerm),
            )
        }

        setFilteredPrompts(newFiltered)
    }

    function pollLocalStorage() {
        const intervalId = setInterval(() => {
            // Get value from localStorage
            const finishedAuthValue = localStorage.getItem("finishedAuthEvent")

            // Check if the value exists and is not an empty string
            if (finishedAuthValue && finishedAuthValue !== "") {
                // Do your desired code here
                filterPrompts()
                setFilteredPrompts(getObject("prompts", []))
                showToast(finishedAuthValue)
                localStorage.setItem("finishedAuthEvent", "")
                clearInterval(intervalId)
            }
        }, 1000) // Polls every 1000ms or 1 second
    }

    useEffect(() => {
        const handleMessage = async function (event) {
            const data = JSON.parse(event.data)
            if (data.message === "newAuthToken") {
                localStorage.setItem("GOOGLE_API_TOKEN", data.token)
                console.log("API TOKEN UPDATED")
                finishAuth()
                pollLocalStorage()
            } else if (data.message === "transfer") {
                console.log(data.prompts)
                console.log("recieved transfer prompts")
                const prompts = data.prompts
                setObject("transferPrompts", prompts)
            }
        }

        window.addEventListener("message", handleMessage)

        return () => {
            // Clean up the event listener when the component unmounts
            window.removeEventListener("message", handleMessage)
        }
    })

    function showToast(message) {
        setToast(true)
        setToastMessage(message)
        setTimeout(() => {
            setToast(false)
            setToastMessage("")
        }, 3000)
    }

    return (
        <div data-theme={theme} className={`flex bg-base-100 w-[100vw] h-[100vh] overflow-hidden`}>
            <Sidebar
                filteredPrompts={filteredPrompts}
                setFilteredPrompts={setFilteredPrompts}
                filterPrompts={filterPrompts}
                setPrompts={setPrompts}
                setFolders={setFolders}
                folders={folders}
                setSelectedFolder={setSelectedfolder}
                selectedFolder={selectedFolder}
                setFilterTags={setFilterTags}
                filterTags={filterTags}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                showToast={showToast}
            />
            <MainContent
                filteredPrompts={filteredPrompts}
                setFilteredPrompts={setFilteredPrompts}
                filterPrompts={filterPrompts}
                setPrompts={setPrompts}
                prompts={prompts}
                tags={tags}
                folders={folders}
                filterTags={filterTags}
                setFilterTags={setFilterTags}
                setSelectedFolder={setSelectedfolder}
                selectedFolder={selectedFolder}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            {toast && <Toast message={toastMessage} />}
            {transferring && <TransferModal />}
        </div>
    )
}

export default App
