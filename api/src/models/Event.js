import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title:{type:String,required:true,trim:true},
    description: {type:String, default: ''},
    startsAt: {type:Date, required:true},
    price: {type:Number ,required:true,min:0},
    venue: {type:mongoose.Schema.ObjectId , ref:"Venue" , required:true},
    organizer: {type:mongoose.Schema.ObjectId, ref: "User", required:true},
    categories: {type: [String],default:[]},
},{timestamps:true})

eventSchema.index({startsAt:1});
eventSchema.index({organizer:1 ,startsAt:1})
eventSchema.index({venue:1, startsAt:1})


export const Event = mongoose.model("Event",eventSchema)