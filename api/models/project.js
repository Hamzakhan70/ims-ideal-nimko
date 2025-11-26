// server/models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    packets: {
        type: Number,
        min: 1,
        default: null
    },
    imageURL: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        default: 100,
        min: 0
    },
    featured: {
        type: Boolean,
        default: false
    },
    productLinks: {
        type: [String],
        default: []
    },
    additionalImages: {
        type: [String],
        default: []
    }
}, {timestamps: true});

export default mongoose.model("Product", productSchema);
