import { useEffect, useRef, useState } from 'react'
import './App.scss'
import logo from "./assets/planity.png"

function App() {

  const [displayProgressBar, setDisplayProgressBar] = useState<boolean>(false)
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [btnLabel, setBtnLabel] = useState<string>("Upload")
  const [inputDisabled, setInputDisabled] = useState<boolean>(false)
  const [invisibleLinkHref, setInvisibleLinkHref] = useState<string>("")

  const sendCSVFile = async (e:React.ChangeEvent<HTMLInputElement>)=>{

    // If we don't want to use axios, the only remaining choice is XMLHttpRequest since fetch doesn't support progress

    if(e.target.files){

      const xhrReq = new XMLHttpRequest()

      const formData = new FormData()
      formData.append("csvFile", e.target.files[0])

      xhrReq.upload.onprogress = (ev:ProgressEvent)=>{
        if(ev.lengthComputable){
          const newProgress = ev.loaded / ev.total * 100
          setProgressPercent(newProgress)
          if(newProgress === 100){
            setDisplayProgressBar(false)
            setBtnLabel("Processing ...")
          }
        }
      }

      xhrReq.onreadystatechange = ()=>{
        if(xhrReq.readyState === 4 && xhrReq.status === 200){
          const blob = new Blob([xhrReq.response], {type:"application/zip"})
          const url = window.URL.createObjectURL(blob)
          setInvisibleLinkHref(url)
        }
      }

      xhrReq.responseType = "blob"

      xhrReq.open("POST", "/csv/upload")
      xhrReq.send(formData)


      setDisplayProgressBar(true)
      setBtnLabel("Uploading ...")
      setInputDisabled(true)

    }
    else alert("Please select a CSV file")
  }

  const linkRef = useRef<HTMLAnchorElement>(null)

  useEffect(()=>{
    if(invisibleLinkHref.length){
      if(linkRef.current){
        // Automatically downloading the zip file
        linkRef.current.click()
        setBtnLabel("Upload")
        setInputDisabled(false)
      }
      else{
        alert("Erreur : Le serveur n'a pas renvoyé de fichier ZIP")
      }
      window.URL.revokeObjectURL(invisibleLinkHref) // Deleting the zip file from local cache once downloaded
    }
  }, [invisibleLinkHref])

  return (
    <div className="App"> 

      <div className='planityTestContainer'>

        <img src={logo} alt="Planity" />

        <div className='progressBar' style={{display: displayProgressBar ? "flex" : "none"}}>
          <div className='progress' style={{width:progressPercent + "%"}} ></div>
        </div>

        <label className='uploadFileButton' htmlFor='uploadFileInput'>{btnLabel}</label>
        <input 
          id="uploadFileInput" 
          disabled={inputDisabled}
          type="file" accept='.csv' 
          onChange={sendCSVFile} 
          onClick={(e)=>{e.currentTarget.value=""}} // This is here to avoid bugs when clicking again on the button
        />

        <a download="gendersData.zip" className='invisibleLink' href={invisibleLinkHref} ref={linkRef} ></a>

      </div>
    </div>
  )
}

export default App
