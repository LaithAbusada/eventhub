import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "User" , required:true},
    event: {type: mongoose.Schema.ObjectId, ref: "Event", required:true},
    status: {type:String, enum:['confirmed','cancelled'], default:'confirmed'},
    ticketCount: {type:Number, min:1, max:10, default :1},
},{timestamps:{createdAt:true , updatedAt:false}})


registrationSchema.index({
    user:1,
    event:1
},{unique:true})

registrationSchema.index({
    event:1,
    status:1
})

export const Registration = mongoose.model("Registration",registrationSchema);