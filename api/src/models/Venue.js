import mongoose from "mongoose";


const venueSchema = new mongoose.Schema({
    name: {type:String,required:true,trim:true},
    city: {type:String,required:true,trim:true},
    address: {type:String,trim:true},
    capacity:{type:Number,required:true,min: 1},
    location: {lat:Number, lng:Number }
}, { timestamps: true })

export const Venue = mongoose.model("Venue",venueSchema);