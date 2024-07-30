import express from "express"
import csvReqHandler from "./csvReqHandler"


const app = express()

app.use("/csv", csvReqHandler) // Route for CSV Handling


app.use(express.static(__dirname + "/planity-front/dist"));
app.use(express.static(__dirname + "/planity-front/public"));

app.listen(8080) 

console.log("\n\n[+] Server is running - http://localhost:8080")