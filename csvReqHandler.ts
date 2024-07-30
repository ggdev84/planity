import express from "express"
import archiver from "archiver"
import fs from "fs/promises"
import {createReadStream, createWriteStream, WriteStream, ReadStream, existsSync} from "fs"
import multer from "multer"


const csvReqHandler = express.Router()
const archiverTool = archiver("zip")

if(!existsSync(__dirname + "/csvFiles")){
    fs.mkdir(__dirname + "/csvFiles")
}


export const storage:multer.StorageEngine =  multer.diskStorage({
    destination:(req, file, callback)=>{
        callback(null, __dirname + "/csvFiles")
    },
    filename(req, file, callback) {
        const date:Date = new Date()

        // Adding hours, minutes and milliseconds to have an unique filename
        const newFileName = `${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getMilliseconds()}-${file.originalname}`;
        callback(null, newFileName)
    },
})

export const multerUpload = multer({storage})


type gender = "male" | "female"


const getLineWithEndChar = (line:string)=>{
    return line + "\n"
}

const writeToGenderCSVFile = async (genderStream:WriteStream, line:string)=>{
    genderStream.write(getLineWithEndChar(line))
}

const closeStreams = (streamList: (WriteStream | ReadStream)[])=>{
    streamList.forEach(stream=>stream.close())
}

const createZipArchive = (outputStream:WriteStream, newFolderName:string)=>{
    archiverTool.pipe(outputStream)
    archiverTool.directory(newFolderName, false)
    archiverTool.finalize()
}

const getGenderFileName = (gender:gender, fileName?:string)=>{
    return `${__dirname}/csvFiles/${gender}-${fileName}`
}

const addHeaderToGenderFiles = (streamList: WriteStream[], headerLine:string)=>{
    streamList.forEach(stream=>writeToGenderCSVFile(stream, headerLine))
}


csvReqHandler.post("/upload", multerUpload.single("csvFile") , async (req,res)=>{

    let lineIndex = 0;

    console.log("[+] Receiving new file")

    const fileReadStream = createReadStream(`${__dirname}/csvFiles/${req.file?.filename}`)

    let maleCSVFileName = getGenderFileName("male", req.file?.filename)
    let femaleCSVFileName = getGenderFileName("female", req.file?.filename)

    const maleCSVFileStream = createWriteStream(maleCSVFileName)
    const femaleCSVFileStream = createWriteStream(femaleCSVFileName)
    
    let remainingString:string = ""
    let genderKeyIndex = 0

    fileReadStream.on("data", (chunk)=>{ 

        const stringChunk = remainingString + (chunk instanceof Buffer ? chunk.toString() : chunk)

        let lastEndOfLineIndex:number = stringChunk.lastIndexOf("\n")
    
        // With the data being fetched in chunks, a line can be uncomplete, therefore we have to add it to the next chunk's beginning
        remainingString = lastEndOfLineIndex < stringChunk.length - 1 ? stringChunk.slice().substring(lastEndOfLineIndex, stringChunk.length - 1) : ""

        stringChunk.replace(remainingString,"").split("\n").forEach(async line=>{
            if(line.length){
                if(line.includes(",gender,")){
                    // The program gets the index of the gender key so everything can still work if gender is at another index than 3
                    addHeaderToGenderFiles([femaleCSVFileStream, maleCSVFileStream], line)
                    genderKeyIndex = line.split(",").findIndex((value)=>{return value.includes("gender")})
                }
                else{
                    writeToGenderCSVFile(line.slice().split(",")[genderKeyIndex]?.includes("female") ? femaleCSVFileStream : maleCSVFileStream, line)
                    lineIndex += 1
                }
            }
        })

        remainingString = remainingString.replace("\n", "")
    })

    fileReadStream.on("end", async ()=>{

        closeStreams([fileReadStream, maleCSVFileStream, femaleCSVFileStream])

        const newFolderName = __dirname + "/csvFiles/" + req.file?.filename.split(".")[0] + "-folder"
        await fs.mkdir(newFolderName)

        await fs.rename(maleCSVFileName, newFolderName + "/male.csv")
        maleCSVFileName = newFolderName + "female.csv"

        await fs.rename(femaleCSVFileName, newFolderName + "/female.csv")
        femaleCSVFileName = newFolderName + "female.csv"



        const outputFileName = __dirname + "/csvFiles/" + req.file?.filename.replace(".csv", ".zip")
        const outputStream = createWriteStream(outputFileName)

        outputStream.on("close", ()=>{
            console.log("[+] Sending file : " + outputFileName)

            res.status(200).sendFile(outputFileName)
    
            fs.rm(newFolderName, {recursive:true, force:true})
            fs.rm(outputFileName)
            fs.rm(__dirname + "/csvFiles/"+req.file?.filename)
        })

        createZipArchive(outputStream, newFolderName)


    })
})

export default csvReqHandler